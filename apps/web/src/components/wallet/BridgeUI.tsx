// components/wallet/BridgeUI.tsx
"use client";

import { useState } from 'react';
import { useSmartAccountContext } from '@/lib/SmartAccountProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PolicyViewer } from './PolicyViewer';
import { toast } from 'sonner';
import { ChevronDown, Copy, ExternalLink } from 'lucide-react';


const ZCASH_BRIDGE_ADDRESS = process.env.NEXT_PUBLIC_ZCASH_BRIDGE_ADDRESS || 't1YourBridgeAddressHere';
const RELAYER_API_URL = process.env.NEXT_PUBLIC_RELAYER_API_URL || 'http://localhost:3001';

const CHAINS = ['NEAR', 'Solana', 'Mina'] as const;

function truncateMiddle(str: string, start = 6, end = 4) {
  if (!str) return '';
  if (str.length <= start + end) return str;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

/**
 * Generates memo in format: aaWallet|chain|recipient|refundAddress
 */
function generateMemo(
  aaWallet: string,
  chain: string,
  recipientAddress: string,
  refundAddress: string
): string {
  return `${aaWallet}|${chain}|${recipientAddress}|${refundAddress}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
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
  const [zcashTxId, setZcashTxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    toast.success('Memo generated! Send ZEC to the bridge address with this memo.');
  };

  const handleCopy = async (text: string, label: string) => {
    if (await copyToClipboard(text)) {
      toast.success(`${label} copied!`);
    } else {
      toast.error('Failed to copy');
    }
  };

  /**
   * Submit bridge request to relayer after sending ZEC
   * This tells the relayer which smart wallet owns this deposit
   */
  const handleSubmitBridge = async () => {
    if (!zcashTxId.trim()) {
      toast.error('Please enter the Zcash transaction ID');
      return;
    }

    if (!smartWalletAddress) {
      toast.error('Smart wallet not connected');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${RELAYER_API_URL}/submit-bridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zcashTxId: zcashTxId.trim(),
          aaWallet: smartWalletAddress,
          destinationChain: formData.chain,
          recipientAddress: formData.recipientAddress,
          refundAddress: formData.refundAddress,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit bridge request');
      }

      toast.success('Bridge request submitted! Monitoring for confirmation...');
      setZcashTxId('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit bridge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.chain && formData.recipientAddress && formData.refundAddress;

  return (
    <div className="space-y-6 p-4 max-w-md mx-auto">
      {/* Bridge Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to Bridge ZEC</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Set up your destination details below</li>
          <li>Generate your unique memo</li>
          <li>Send ZEC to the bridge address with the memo</li>
          <li>Enter your Zcash TX ID and submit</li>
        </ol>
      </div>

      {/* Bridge Address Card - Shows ZCASH address, not smart wallet */}
      <div className="space-y-2">
        <Card className={`p-4 relative ${!isMemoGenerated ? 'opacity-60' : ''}`}>
          <div className="space-y-3">
            {/* Zcash Bridge Address */}
            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Zcash Bridge Address</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleCopy(ZCASH_BRIDGE_ADDRESS, 'Bridge address')}
                  disabled={!isMemoGenerated}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="font-mono text-sm break-all mt-1">
                {isMemoGenerated ? ZCASH_BRIDGE_ADDRESS : 't1xxx...xxxx'}
              </p>
            </div>
            
            {/* Memo */}
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Memo (include in transaction)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleCopy(memo, 'Memo')}
                  disabled={!isMemoGenerated}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="font-mono text-xs break-all mt-1 bg-gray-100 p-2 rounded">
                {memo || 'Generate memo first...'}
              </p>
            </div>

            {/* Your Smart Wallet */}
            <div className="pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Your Smart Wallet</span>
              <p className="font-mono text-xs break-all mt-1">
                {smartWalletAddress ? truncateMiddle(smartWalletAddress, 10, 8) : 'Not connected'}
              </p>
            </div>
          </div>
        </Card>
        {!isMemoGenerated && (
          <p className="text-xs text-muted-foreground text-center">
            ⬇️ Setup destination first to reveal bridge details
          </p>
        )}
      </div>

      {/* Destination Setup Form */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">1. Destination Setup</h2>
        
        <div className="space-y-2">
          <Label htmlFor="chain">Destination Chain</Label>
          <div className="relative">
            <select
              id="chain"
              name="chain"
              value={formData.chain}
              onChange={handleInputChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a chain</option>
              {CHAINS.map(chain => (
                <option key={chain} value={chain}>{chain}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipientAddress">Recipient Address on {formData.chain || 'destination'}</Label>
          <Input
            id="recipientAddress"
            name="recipientAddress"
            value={formData.recipientAddress}
            onChange={handleInputChange}
            placeholder={formData.chain === 'NEAR' ? 'alice.near' : 'Enter address'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="refundAddress">Refund Address (Zcash)</Label>
          <Input
            id="refundAddress"
            name="refundAddress"
            value={formData.refundAddress}
            onChange={handleInputChange}
            placeholder="t1... or zs1..."
          />
          <p className="text-xs text-muted-foreground">
            If bridging fails, ZEC will be returned here
          </p>
        </div>

        <Button
          className="w-full"
          onClick={handleGenerateMemo}
          disabled={!isFormValid}
        >
          Generate Memo
        </Button>
      </div>

      {/* After Sending ZEC */}
      {isMemoGenerated && (
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-semibold">2. After Sending ZEC</h2>
          <p className="text-sm text-muted-foreground">
            Once you've sent ZEC to the bridge address, enter your transaction ID:
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="zcashTxId">Zcash Transaction ID</Label>
            <Input
              id="zcashTxId"
              value={zcashTxId}
              onChange={(e) => setZcashTxId(e.target.value)}
              placeholder="Enter txid from your wallet"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmitBridge}
            disabled={!zcashTxId.trim() || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Bridge Request'}
          </Button>
        </div>
      )}

      {/* Policy Viewer */}
      <div className="pt-8 text-center">
        <PolicyViewer />
        <p className="text-xs text-muted-foreground mt-2">
          Your policy governs bridging limits
        </p>
      </div>
    </div>
  );
}