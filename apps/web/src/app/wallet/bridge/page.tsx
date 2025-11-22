// apps/web/src/app/wallet/bridge/page.tsx
"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BridgeUI from '@/components/wallet/BridgeUI';
import { OperationsList } from '@/components/wallet/OperationsList';
import { PolicyViewer } from '@/components/wallet/PolicyViewer';
import { useSmartAccountContext } from '@/lib/SmartAccountProvider';
import { ArrowRightLeft, Clock, Shield, Loader2 } from 'lucide-react';

export default function BridgePage() {
  const { client, isInitializing, error } = useSmartAccountContext();
  const [activeTab, setActiveTab] = useState('bridge');

  // Loading state
  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Initializing smart wallet...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm text-center">
          <p className="text-red-800 font-medium mb-2">Connection Error</p>
          <p className="text-sm text-red-600">{error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-red-700 underline"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
        <p className="text-muted-foreground mb-4">
          Please connect and deploy your smart wallet to use the bridge.
        </p>
        <a 
          href="/login" 
          className="text-primary underline"
        >
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold">ZEC Bridge</h1>
        <p className="text-sm text-muted-foreground">
          Bridge Zcash to other chains securely
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="bridge" className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Bridge
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bridge" className="mt-0">
          <BridgeUI />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <OperationsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}