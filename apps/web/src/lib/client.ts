import { createPublicClient, createWalletClient, http, custom } from "viem";
import { baseSepolia } from "viem/chains";

// Public client: used for read-only blockchain interactions
export const getPublicClient = () =>
    createPublicClient({ chain: baseSepolia, transport: http() });

// Wallet client: used for signed transactions via a connected wallet
export const getWalletClient = async ({
    address,
    eip1193,
}: {
    address: `0x${string}`;
    eip1193: import("viem").EIP1193Provider;
}) =>
    createWalletClient({
        account: address,
        chain: baseSepolia,
        transport: custom(eip1193),
    });
