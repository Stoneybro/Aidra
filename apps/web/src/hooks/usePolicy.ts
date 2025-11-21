// hooks/usePolicy.ts
"use client";

import { toast } from "sonner";
import { useAccount } from 'wagmi';
import { useSmartAccountContext } from '@/lib/SmartAccountProvider';
import { BridgePolicyAddress } from '@/lib/CA';
import { BridgePolicyABI } from '@/lib/abi/BridgePolicyABI';
import { useState } from 'react';
import { encodeFunctionData } from 'viem';

export function usePolicy() {
    const { address: eoaAddress } = useAccount();
    const { getClient,client } = useSmartAccountContext();
    const [isLoading, setIsLoading] = useState(false);

    // Read policy using smart wallet address
    const smartWalletAddress = client?.account?.address;

    // Create policy through smart wallet
    async function createPolicy(
        dailyLimit: bigint,
        perTxLimit: bigint,
        guardianThreshold: bigint,
        guardiansRequired: number,
        allowedChains: string[],
        guardianList: string[]
    ) {
        if (!eoaAddress) throw new Error('No wallet connected');

        setIsLoading(true);
        try {
            const smartAccountClient = await getClient();
            if (!smartAccountClient) throw new Error('Smart wallet not initialized');

            // Encode the createPolicy call
            const callData = encodeFunctionData({
                abi: BridgePolicyABI,
                functionName: 'createPolicy',
                args: [
                    dailyLimit,
                    perTxLimit,
                    guardianThreshold,
                    guardiansRequired,
                    allowedChains,
                    guardianList as `0x${string}`[]
                ]
            });

            // Execute through smart wallet
            const hash = await smartAccountClient.sendUserOperation({
                account: smartAccountClient.account,
                calls: [{
                    to: BridgePolicyAddress as `0x${string}`,
                    data: callData,
                    value: 0n
                }]
            });

            const result = await smartAccountClient.waitForUserOperationReceipt({ hash });
            
            toast.success('Policy created successfully');
            return result.receipt.transactionHash;
        } catch (error: any) {
            toast.error(error.message || 'Failed to create policy');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }

    // Approve operation (for guardians)
    async function approveOperation(
        aaWallet: string,
        destinationChain: string,
        amount: bigint,
        zcashTxHash: string
    ) {
        if (!eoaAddress) throw new Error('No wallet connected');

        setIsLoading(true);
        try {
            const smartAccountClient = await getClient();
            if (!smartAccountClient) throw new Error('Smart wallet not initialized');

            const callData = encodeFunctionData({
                abi: BridgePolicyABI,
                functionName: 'approveOperation',
                args: [aaWallet as `0x${string}`, destinationChain, amount, zcashTxHash as `0x${string}`]
            });

            const hash = await smartAccountClient.sendUserOperation({
                account: smartAccountClient.account,
                calls: [{
                    to: BridgePolicyAddress as `0x${string}`,
                    data: callData,
                    value: 0n
                }]
            });

            const result = await smartAccountClient.waitForUserOperationReceipt({ hash });
            
            toast.success('Operation approved');
            return result.receipt.transactionHash;
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve operation');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }

    return {
        smartWalletAddress,
        createPolicy,
        approveOperation,
        isLoading
    };
}