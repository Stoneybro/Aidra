"use client";

import { toast } from "sonner";
import { useAccount } from 'wagmi';
import { useSmartAccountContext } from '@/lib/SmartAccountProvider';
import { BridgeExecutorAddress } from '@/lib/CA';
import { BridgeExecutorABI } from '@/lib/abi/BridgeExecutorABI';
import { useState } from 'react';
import { OperationStatus } from '@/utils/helpers';
import {  useWatchContractEvent } from 'wagmi';
import { encodeFunctionData } from "viem";

export function useBridgeOperations() {
  const { address: eoaAddress } = useAccount();
  const { getClient,client } = useSmartAccountContext();
  const [operations, setOperations] = useState<any[]>([]);
  
  const smartWalletAddress = client?.account?.address;

  // Watch events using smart wallet address
  useWatchContractEvent({
    address: BridgeExecutorAddress as `0x${string}`,
    abi: BridgeExecutorABI,
    eventName: 'BridgeRequested',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (log.args.aaWallet?.toLowerCase() === smartWalletAddress?.toLowerCase()) {
          addOrUpdateOperation({
            zcashTxHash: log.args.zcashTxHash,
            amount: log.args.amount,
            destinationChain: log.args.destinationChain,
            recipientAddress: log.args.recipientAddress,
            status: OperationStatus.Pending,
            timestamp: Date.now()
          });
        }
      });
    }
  });

  useWatchContractEvent({
    address: BridgeExecutorAddress as `0x${string}`,
    abi: BridgeExecutorABI,
    eventName: 'BridgeCompleted',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (log.args.aaWallet?.toLowerCase() === smartWalletAddress?.toLowerCase()) {
          updateOperationStatus(log.args.zcashTxHash, OperationStatus.Completed);
        }
      });
    }
  });

  useWatchContractEvent({
    address: BridgeExecutorAddress as `0x${string}`,
    abi: BridgeExecutorABI,
    eventName: 'BridgeFailed',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (log.args.aaWallet?.toLowerCase() === smartWalletAddress?.toLowerCase()) {
          updateOperationStatus(log.args.zcashTxHash, OperationStatus.Failed);
        }
      });
    }
  });

  function addOrUpdateOperation(op: any) {
    setOperations(prev => {
      const existing = prev.findIndex(o => o.zcashTxHash === op.zcashTxHash);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], ...op };
        return updated;
      }
      return [op, ...prev];
    });
  }

  function updateOperationStatus(zcashTxHash: string, status: OperationStatus) {
    setOperations(prev =>
      prev.map(op =>
        op.zcashTxHash === zcashTxHash ? { ...op, status } : op
      )
    );
  }

  // Request refund through smart wallet
  async function requestRefund(zcashTxHash: string) {
    if (!eoaAddress) throw new Error('No wallet connected');

    try {
      const smartAccountClient = await getClient();
      if (!smartAccountClient) throw new Error('Smart wallet not initialized');

      const callData = encodeFunctionData({
        abi: BridgeExecutorABI,
        functionName: 'requestRefund',
        args: [zcashTxHash as `0x${string}`]
      });

      const hash = await smartAccountClient.sendUserOperation({
        account: smartAccountClient.account,
        calls: [{
          to: BridgeExecutorAddress as `0x${string}`,
          data: callData,
          value: 0n
        }]
      });

      const result = await smartAccountClient.waitForUserOperationReceipt({ hash });
      
      toast.success('Refund requested');
      return result.receipt.transactionHash;
    } catch (error: any) {
      toast.error(error.message || 'Failed to request refund');
      throw error;
    }
  }

  // Retry bridge (after guardian approval) through smart wallet
  async function retryBridge(zcashTxHash: string) {
    if (!eoaAddress) throw new Error('No wallet connected');

    try {
      const smartAccountClient = await getClient();
      if (!smartAccountClient) throw new Error('Smart wallet not initialized');

      const callData = encodeFunctionData({
        abi: BridgeExecutorABI,
        functionName: 'retryBridge',
        args: [zcashTxHash as `0x${string}`]
      });

      const hash = await smartAccountClient.sendUserOperation({
        account: smartAccountClient.account,
        calls: [{
          to: BridgeExecutorAddress as `0x${string}`,
          data: callData,
          value: 0n
        }]
      });

      const result = await smartAccountClient.waitForUserOperationReceipt({ hash });
      
      toast.success('Bridge retry initiated');
      return result.receipt.transactionHash;
    } catch (error: any) {
      toast.error(error.message || 'Failed to retry bridge');
      throw error;
    }
  }

  // Get operation details (kept as placeholder)
  async function getOperation(zcashTxHash: string) {
    // This would use useReadContract in real implementation
    return null;
  }

  return {
    smartWalletAddress,
    operations,
    getOperation,
    requestRefund,
    retryBridge
  };
}