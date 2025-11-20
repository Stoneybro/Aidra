import { useCallback, useEffect, useState } from "react";
import {
  toSmartAccount, entryPoint07Abi, type UserOperation,
  entryPoint07Address,
  getUserOperationHash
} from "viem/account-abstraction";
import { AidraSmartWalletABI } from "./abi/AidraSmartWalletAbi";
import { encodeFunctionData, decodeFunctionData, concat, pad, toHex } from "viem";
import { AidraSmartWalletFactoryAddress } from "./CA";
import { AidraSmartWalletFactoryABI } from "./abi/AidraSmartWalletFactoryAbi";
import { getPublicClient } from "./client";
import { useAccount, useWalletClient } from "wagmi";
import type { SmartAccount } from "viem/account-abstraction";


export type CustomSmartAccount = SmartAccount;

export default function CustomSmartAccount() {
  const [customSmartAccount, setCustomSmartAccount] = useState<CustomSmartAccount | null>(null);
  const { address: ownerAddress, connector } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const publicClient=getPublicClient();

  useEffect(() => {
    setCustomSmartAccount(null);
    setError(null);
    setIsLoading(false);
  }, [ownerAddress]);

  async function predictAddress(ownerAddress: `0x${string}`) {
    try {
      console.debug("[CustomSmartAccount] Predicting address for owner:", ownerAddress);
      console.debug("[CustomSmartAccount] Factory address:", AidraSmartWalletFactoryAddress);
      console.debug("[CustomSmartAccount] Chain:", publicClient.chain.name, publicClient.chain.id);

      // First check if factory contract is deployed
      const bytecode = await publicClient.getBytecode({
        address: AidraSmartWalletFactoryAddress,
      });

      if (!bytecode || bytecode === "0x") {
        throw new Error(
          `Factory contract not deployed at ${AidraSmartWalletFactoryAddress} on ${publicClient.chain.name}. ` +
          `Please verify the contract is deployed and the address is correct.`
        );
      }

      console.debug("[CustomSmartAccount] Factory contract verified, bytecode length:", bytecode.length);

      // Check if implementation is set
      try {
        const implementationAddress = await publicClient.readContract({
          address: AidraSmartWalletFactoryAddress,
          abi: AidraSmartWalletFactoryABI,
          functionName: "implementation",
        }) as `0x${string}`;

        console.debug("[CustomSmartAccount] Implementation address:", implementationAddress);

        if (!implementationAddress || implementationAddress === "0x0000000000000000000000000000000000000000") {
          throw new Error("Factory implementation address is not set or is zero address");
        }

        // Check if implementation is deployed
        const implBytecode = await publicClient.getBytecode({
          address: implementationAddress,
        });

        if (!implBytecode || implBytecode === "0x") {
          throw new Error(
            `Implementation contract not deployed at ${implementationAddress}. ` +
            `The factory is deployed but points to an undeployed implementation.`
          );
        }

        console.debug("[CustomSmartAccount] Implementation verified, bytecode length:", implBytecode.length);
      } catch (err: any) {
        console.warn("[CustomSmartAccount] Could not verify implementation:", err.message);
        // Continue anyway, might not be critical
      }

      // Call getPredictedAddress
      const result = await publicClient.readContract({
        address: AidraSmartWalletFactoryAddress,
        abi: AidraSmartWalletFactoryABI,
        functionName: "getPredictedAddress",
        args: [ownerAddress],
      }) as `0x${string}`;

      console.debug("[CustomSmartAccount] Predicted smart account address:", result);

      if (!result || result === "0x0000000000000000000000000000000000000000") {
        throw new Error("getPredictedAddress returned zero address");
      }

      return result;
    } catch (err: any) {
      console.error("[CustomSmartAccount] predictAddress error:", err);
      
      // Provide detailed error message
      if (err.message?.includes("not deployed") || err.message?.includes("Implementation")) {
        throw err; // Re-throw our custom errors
      }

      if (err.message?.includes("returned no data")) {
        throw new Error(
          `Factory contract call failed. Possible issues:\n` +
          `1. Implementation contract not deployed (check factory.implementation())\n` +
          `2. Factory not properly initialized\n` +
          `3. Network/RPC issues\n` +
          `4. ABI mismatch\n\n` +
          `Factory: ${AidraSmartWalletFactoryAddress}\n` +
          `Chain: ${publicClient.chain.name} (${publicClient.chain.id})\n` +
          `Original: ${err.message}`
        );
      }

      throw new Error(
        `Failed to predict smart account address: ${err.message || err}`
      );
    }
  }

  const initCustomAccount = useCallback(async () => {
    setError(null);

    if (!ownerAddress) {
      const err = new Error("Owner address is undefined");
      setError(err);
      throw err;
    }

    // Wait for wallet client to be available
    if (!walletClient) {
      const err = new Error("Wallet client is not ready yet");
      setError(err);
      throw err;
    }

    // Return existing account if already initialized
    if (customSmartAccount) return customSmartAccount;

    setIsLoading(true);
    try {
      const account = await toSmartAccount({
        client: publicClient,
        entryPoint: {
          address: entryPoint07Address,
          version: "0.7",
          abi: entryPoint07Abi,
        },

        async decodeCalls(data) {
          try {
            const decoded = decodeFunctionData({
              abi: AidraSmartWalletABI,
              data: data as `0x${string}`,
            });

            if (decoded.functionName === "executeBatch" && decoded.args) {
              const batchCalls = decoded.args[0] as Array<{
                target: `0x${string}`;
                value: bigint;
                data: `0x${string}`;
              }>;
              return batchCalls.map((call) => ({
                to: call.target,
                value: call.value,
                data: call.data,
              }));
            } else if (decoded.functionName === "execute" && decoded.args) {
              const [target, value, callData] = decoded.args as [`0x${string}`, bigint, `0x${string}`];
              return [{ to: target, value, data: callData }];
            }
          } catch (e) {
            console.warn("Failed to decode calls:", e);
          }
          return [{ to: "0x0000000000000000000000000000000000000000", value: 0n, data }];
        },

        async encodeCalls(calls) {
          if (calls.length === 1) {
            const call = calls[0];
            return encodeFunctionData({
              abi: AidraSmartWalletABI,
              functionName: "execute",
              args: [call.to, call.value || 0n, call.data || "0x"],
            });
          }

          const batchCalls = calls.map((call) => ({
            target: call.to,
            value: call.value || 0n,
            data: call.data || "0x",
          }));

          return encodeFunctionData({
            abi: AidraSmartWalletABI,
            functionName: "executeBatch",
            args: [batchCalls],
          });
        },

        async getAddress() {
          return predictAddress(ownerAddress);
        },

        async getFactoryArgs() {
          return {
            factory: AidraSmartWalletFactoryAddress,
            factoryData: encodeFunctionData({
              abi: AidraSmartWalletFactoryABI,
              functionName: "createSmartAccount",
              args: [ownerAddress],
            }),
          };
        },

        async getNonce() {
          const sender = await predictAddress(ownerAddress);
          return publicClient.readContract({
            address: entryPoint07Address,
            abi: entryPoint07Abi,
            functionName: "getNonce",
            args: [sender, 0n],
          }) as Promise<bigint>;
        },

        async getStubSignature() {
          return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c" as `0x${string}`;
        },

        async signMessage({ message }) {
          // Wallet handles ECDSA signing automatically
          const signature = await walletClient.signMessage({
            account: ownerAddress,
            message,
          });
          return signature;
        },

        async signTypedData(typedData) {
          // Wallet handles ECDSA signing automatically
          if (!typedData.types) {
            throw new Error("Typed data types are required for signing");
          }

          const signature = await walletClient.signTypedData({
            types: typedData.types as Record<string, Array<{ name: string; type: string }>>,
            primaryType: typedData.primaryType as string,
            domain: typedData.domain as { chainId: number; name: string; verifyingContract: `0x${string}`; version: string; },
            message: typedData.message as Record<string, unknown>,
          });
          return signature as `0x${string}`;
        },

        async signUserOperation(userOperation) {
          if (!userOperation.sender) {
            throw new Error("Missing sender in user operation");
          }

          const fullUserOperation: UserOperation = {
            ...(userOperation as UserOperation),
            sender: userOperation.sender,
          };

          const userOpHash = getUserOperationHash({
            userOperation: fullUserOperation,
            entryPointAddress: entryPoint07Address,
            entryPointVersion: "0.7",
            chainId: publicClient.chain.id,
          });

          // Sign the userOpHash - wallet applies EIP-191 automatically
          const signature = await walletClient.signMessage({
            account: ownerAddress,
            message: { raw: userOpHash },
          });

          return signature;
        },
      });

      setCustomSmartAccount(account);
      return account;
    } catch (err) {
      console.error("custom account error", err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [ownerAddress, walletClient, customSmartAccount]);

  const resetCustomAccount = useCallback(() => {
    setCustomSmartAccount(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { initCustomAccount, isLoading, error, resetCustomAccount, isReady: !!walletClient };
}