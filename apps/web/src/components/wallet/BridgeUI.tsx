// components/wallet/BridgeUI.tsx
"use client";

import { useState } from 'react';
import { useSmartAccountContext } from '@/lib/SmartAccountProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateMemo, copyToClipboard } from '@/utils/format';
import { PolicyViewer } from './PolicyViewer';
import { toast } from 'sonner';
import { ChevronDown, Copy } from 'lucide-react';

const CHAINS = ['NEAR', 'Solana', 'Mina'] as const;

function truncateMiddle(str: string, start = 6, end = 4) {
  if (!str) return '';
  if (str.length <= start + end) return str;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

export default function BridgeUI() {
  const { client } = useSmartAccountContext();
  const smartWalletAddress = client?.account?.address;
  const [memo, setMemo] = useState('');
  const [formData, setFormData] = useState({
    chain: '',
    recipientAddress: '',
    refundAddress: ''
  });
  const [isMemoGenerated, setIsMemoGenerated] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateMemo = () => {
    if (!smartWalletAddress) {
      toast.error('Smart wallet not connected');
      return;
    }

    const newMemo = generateMemo(
      smartWalletAddress,
      formData.chain,
      formData.recipientAddress,
      formData.refundAddress
    );
    
    setMemo(newMemo);
    setIsMemoGenerated(true);
    toast.success('Memo generated successfully');
  };

  const handleCopy = async (text: string) => {
    if (await copyToClipboard(text)) {
      toast.success('Copied to clipboard!');
    } else {
      toast.error('Failed to copy');
    }
  };

  const isFormValid = formData.chain && formData.recipientAddress && formData.refundAddress;

  return (
    <div className="space-y-6 p-4 max-w-md mx-auto">
      {/* Bridge Address Card */}
      <div className="space-y-2">
        <Card className={`p-4 relative ${!isMemoGenerated ? 'blur-sm' : ''}`}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Bridge Address</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCopy(smartWalletAddress || '')}
                disabled={!isMemoGenerated}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="font-mono text-sm break-all">
              {smartWalletAddress ? truncateMiddle(smartWalletAddress) : '0x1234...5678'}
            </p>
            
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Memo</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCopy(memo)}
                disabled={!isMemoGenerated}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="font-mono text-sm break-all">
              {memo ? truncateMiddle(memo, 10, 8) : 'your-memo-here'}
            </p>
          </div>
        </Card>
        {!isMemoGenerated && (
          <p className="text-xs text-muted-foreground text-center">
            Setup destination before sending to this bridge
          </p>
        )}
      </div>

      {/* Rest of the component remains the same */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Destination Setup</h2>
        
        <div className="space-y-2">
          <Label htmlFor="chain">Destination Chain</Label>
          <div className="relative">
            <select
              id="chain"
              name="chain"
              value={formData.chain}
              onChange={handleInputChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a chain</option>
              {CHAINS.map(chain => (
                <option key={chain} value={chain}>
                  {chain}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipientAddress">Recipient Address</Label>
          <Input
            id="recipientAddress"
            name="recipientAddress"
            value={formData.recipientAddress}
            onChange={handleInputChange}
            placeholder="Enter recipient address"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="refundAddress">Refund Address (Zcash t-address or z-address)</Label>
          <Input
            id="refundAddress"
            name="refundAddress"
            value={formData.refundAddress}
            onChange={handleInputChange}
            placeholder="Enter refund address"
          />
        </div>

        <Button
          className="w-full"
          onClick={handleGenerateMemo}
          disabled={!isFormValid}
        >
          Generate Memo
        </Button>
      </div>

<div className="pt-8 text-center">
  <PolicyViewer />
  <p className="text-xs text-muted-foreground mt-2">
    This policy governs your bridging
  </p>
  </div>
    </div>
  );
}