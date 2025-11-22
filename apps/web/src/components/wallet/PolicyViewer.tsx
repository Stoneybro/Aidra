"use client";

import { useState } from 'react';
import { useSmartAccountContext } from '@/lib/SmartAccountProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BridgePolicyABI } from '@/lib/abi/BridgePolicyABI';
import { BridgePolicyAddress } from '@/lib/CA';
import { formatUnits } from 'viem'; // ✅ Use formatUnits instead
import { useReadContract } from 'wagmi';

const ZEC_DECIMALS = 8; // ✅ Define ZEC decimals

interface PolicyData {
  dailyLimit: bigint;
  perTxLimit: bigint;
  guardianThreshold: bigint;
  guardiansRequired: number;
  allowedChains?: string[];
  guardians?: string[];
  isActive: boolean;
}

export function PolicyViewer() {
  const { client } = useSmartAccountContext();
  const [isOpen, setIsOpen] = useState(false);
  const smartWalletAddress = client?.account?.address;

  const { data: policyData, isLoading: isPolicyLoading, error: policyError } = useReadContract({
    abi: BridgePolicyABI,
    address: BridgePolicyAddress as `0x${string}`,
    functionName: 'getPolicy',
    args: [smartWalletAddress as `0x${string}`],
    query: {
      enabled: !!smartWalletAddress && isOpen
    }
  });

  const { data: guardians, isLoading: isGuardiansLoading } = useReadContract({
    abi: BridgePolicyABI,
    address: BridgePolicyAddress as `0x${string}`,
    functionName: 'getGuardians',
    args: [smartWalletAddress as `0x${string}`],
    query: {
      enabled: !!smartWalletAddress && isOpen
    }
  });

  // ✅ Helper to format ZEC amounts
  const formatZec = (amount: bigint): string => {
    return formatUnits(amount, ZEC_DECIMALS);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          View Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bridge Policy</DialogTitle>
        </DialogHeader>

        {policyData ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <h3 className="font-medium">Limits</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Daily Limit:</div>
                <div className="text-right font-mono">
                  {formatZec((policyData as PolicyData).dailyLimit)} ZEC
                </div>

                <div>Per Transaction Limit:</div>
                <div className="text-right font-mono">
                  {formatZec((policyData as PolicyData).perTxLimit)} ZEC
                </div>

                <div>Guardian Threshold:</div>
                <div className="text-right font-mono">
                  {formatZec((policyData as PolicyData).guardianThreshold)} ZEC
                </div>
              </div>
            </div>

            {guardians && guardians.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">
                  Guardians ({(policyData as PolicyData).guardiansRequired} required)
                </h3>
                <div className="space-y-1">
                  {guardians.map((guardian, index) => (
                    <div key={index} className="font-mono text-sm break-all">
                      {guardian}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${(policyData as PolicyData).isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                  }`}>
                  {(policyData as PolicyData).isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            {isPolicyLoading ? 'Loading...' : 'No policy found. Create one to get started.'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}