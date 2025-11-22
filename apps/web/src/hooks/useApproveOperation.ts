"use client";

import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { useSmartAccountContext } from '@/lib/SmartAccountProvider';
import { BridgePolicyAddress } from '@/lib/CA';
import { BridgePolicyABI } from '@/lib/abi/BridgePolicyABI';
import { useMutation } from '@tanstack/react-query';
import { encodeFunctionData, parseUnits } from 'viem';
import { useRouter } from 'next/navigation';


// ZEC has 8 decimals (same as Bitcoin)
const ZEC_DECIMALS = 8;


export function useApproveOperation() {
        const { address: eoaAddress } = useAccount();
        const { getClient, client } = useSmartAccountContext();
        const router = useRouter();
    
        // Read policy using smart wallet address
        const smartWalletAddress = client?.account?.address;
    
        /**
         * Convert human-readable ZEC amount to zatoshis (smallest unit)
         * @param amount - ZEC amount as string (e.g., "1.5" for 1.5 ZEC)
         * @returns BigInt in zatoshis
         */
        function parseZecAmount(amount: string): bigint {
            return parseUnits(amount, ZEC_DECIMALS);
        }

            const approveOperationMutation = useMutation({
                mutationFn: async ({
                    aaWallet,
                    destinationChain,
                    amount,
                    zcashTxHash
                }: {
                    aaWallet: string;
                    destinationChain: string;
                    amount: bigint;
                    zcashTxHash: string;
                }) => {
                    if (!eoaAddress) throw new Error('No wallet connected');
        
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
                    return result.receipt.transactionHash;
                },
                onSuccess: () => {
                    toast.success('Operation approved successfully');
                },
                onError: (error: Error) => {
                    toast.error(error.message || 'Failed to approve operation');
                }
            });
        return {
        smartWalletAddress,
        approveOperation: approveOperationMutation.mutate,
        approveOperationMutation,
        isLoading: approveOperationMutation.isPending,
        parseZecAmount
    };
}