// components/wallet/OperationsList.tsx
"use client";

import { useState, useEffect } from 'react';
import { useSmartAccountContext } from '@/lib/SmartAccountProvider';
import { useBridgeOperations } from '@/hooks/useBridgeOperation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatUnits } from 'viem';

const ZEC_DECIMALS = 8;

// Status display config
const STATUS_CONFIG = {
  0: { label: 'Pending', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  1: { label: 'Completed', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  2: { label: 'Failed', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  3: { label: 'Refunded', icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50' },
};

function formatZec(zatoshis: bigint | number): string {
  const value = typeof zatoshis === 'bigint' ? zatoshis : BigInt(zatoshis);
  return parseFloat(formatUnits(value, ZEC_DECIMALS)).toFixed(4);
}

function truncateHash(hash: string, start = 8, end = 6): string {
  if (!hash) return '';
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

interface Operation {
  zcashTxHash: string;
  amount: bigint | number;
  destinationChain: string;
  recipientAddress: string;
  status: number;
  timestamp: number;
  requiresGuardians?: boolean;
}

export function OperationsList() {
  const { client } = useSmartAccountContext();
  const { operations, requestRefund, retryBridge } = useBridgeOperations();
  const [expandedOp, setExpandedOp] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleRefund = async (zcashTxHash: string) => {
    setLoadingAction(zcashTxHash);
    try {
      await requestRefund(zcashTxHash);
    } catch (error) {
      // Error handled in hook
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRetry = async (zcashTxHash: string) => {
    setLoadingAction(zcashTxHash);
    try {
      await retryBridge(zcashTxHash);
    } catch (error) {
      // Error handled in hook
    } finally {
      setLoadingAction(null);
    }
  };

  if (!client) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">Connect wallet to view operations</p>
      </Card>
    );
  }

  if (operations.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-medium mb-1">No Operations Yet</h3>
        <p className="text-sm text-muted-foreground">
          Your bridge operations will appear here
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">Recent Operations</h3>
      
      {operations.map((op: Operation) => {
        const status = STATUS_CONFIG[op.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG[0];
        const StatusIcon = status.icon;
        const isExpanded = expandedOp === op.zcashTxHash;
        const isLoading = loadingAction === op.zcashTxHash;
        const canRefund = op.status === 2 || (op.status === 0 && Date.now() - op.timestamp > 86400000);
        const canRetry = op.status === 0 && op.requiresGuardians;

        return (
          <Card key={op.zcashTxHash} className="overflow-hidden">
            {/* Header - Always visible */}
            <button
              onClick={() => setExpandedOp(isExpanded ? null : op.zcashTxHash)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${status.bg}`}>
                  <StatusIcon className={`w-4 h-4 ${status.color}`} />
                </div>
                <div className="text-left">
                  <div className="font-medium">
                    {formatZec(op.amount)} ZEC → {op.destinationChain}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {timeAgo(op.timestamp)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t space-y-3">
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-sm pt-3">
                  <div>
                    <span className="text-muted-foreground">Zcash TX</span>
                    <div className="font-mono text-xs">
                      {truncateHash(op.zcashTxHash)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Recipient</span>
                    <div className="font-mono text-xs">
                      {truncateHash(op.recipientAddress, 10, 8)}
                    </div>
                  </div>
                </div>

                {/* Guardian Notice */}
                {op.requiresGuardians && op.status === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ This transaction requires guardian approval
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {canRefund && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefund(op.zcashTxHash)}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-1" />
                      )}
                      Request Refund
                    </Button>
                  )}
                  
                  {canRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry(op.zcashTxHash)}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : null}
                      Retry Bridge
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`https://explorer.zcha.in/transactions/${op.zcashTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}