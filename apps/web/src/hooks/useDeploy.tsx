"use client";

import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useSmartAccountContext } from "@/lib/SmartAccountProvider";

import { useRouter } from "next/navigation";

export function useDeployWallet() {
  const { getClient } = useSmartAccountContext();
  const { address: ownerAddress } = useAccount();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      // defensive checks up front
      if (!ownerAddress) {
        throw new Error("No connected wallet found. Please connect your wallet.");
      }

      // try to get client (short timeout to avoid hanging)
      let smartAccountClient;
      try {
        smartAccountClient = await getClient({ timeoutMs: 5000 });
      } catch (err) {
        // bubble a clear error so onError can react
        throw new Error("Failed to initialize smart account client. Try reconnecting or refresh the page.");
      }

      if (!smartAccountClient) {
        throw new Error("Smart Account Client is not initialized");
      }

      // perform a minimal zero-value call to trigger wallet deployment
      const hash = await smartAccountClient.sendUserOperation({
        account: smartAccountClient.account,
        calls: [
          {
            to: ownerAddress,
            data: "0x" as `0x${string}`,
            value: 0n,
          },
        ],
      });

      const result = await smartAccountClient.waitForUserOperationReceipt({ hash });
      if (!result) throw new Error("User operation receipt not received");

      return smartAccountClient.account?.address;
    },

    onSuccess: (address) => {
      if (!address) {
        toast.error("Failed to get wallet address");
        return;
      }

      router.push("/wallet");
      toast.success("Wallet deployed");
    },

    onError: async (error: unknown) => {
      console.error("Deployment failed:", error);

      try {
        await getClient({ timeoutMs: 3000 });
       
        const retry = window.confirm(
          "Deployment failed but connection appears restored. Retry deployment now?"
        );
        if (retry) {
          router.refresh();
          return;
        }
      } catch {
        // connection still broken
      }

      const refresh = window.confirm(
        "Wallet deployment failed. Would you like to refresh the page and try again?"
      );
      if (refresh) {
        router.refresh();
      } else {
        toast.error("Failed to deploy wallet. Try reconnecting your wallet and retry.");
      }
    },
  });
}