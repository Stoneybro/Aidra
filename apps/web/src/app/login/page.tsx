"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useDeployWallet } from "@/hooks/useDeploy";
import { useSmartAccountContext } from "@/lib/SmartAccountProvider";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { mutate: deployWallet, isPending: isDeploying } = useDeployWallet();
  const { client, isInitializing, error: smartAccountError } = useSmartAccountContext();
  const [predictedAddress, setPredictedAddress] = useState<string | null>(null);

  // Get predicted smart account address
  useEffect(() => {
    if (client?.account?.address) {
      setPredictedAddress(client.account.address);
    } else {
      setPredictedAddress(null);
    }
  }, [client]);

  const handleDeploy = () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }
    deployWallet();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Aidra Smart Wallet
          </h1>
          <p className="text-gray-600">
            Connect your wallet to get started
          </p>
        </div>

        {/* Connection Status */}
        {!isConnected ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500">
                Choose a wallet to connect
              </p>
            </div>

            {/* Wallet Connectors */}
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {isConnecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : null}
                  Connect with {connector.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connected Wallet Info */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-800">
                  Wallet Connected
                </span>
              </div>
              <p className="text-sm text-gray-700 font-mono break-all">
                {address}
              </p>
            </div>

            {/* Smart Account Status */}
            {isInitializing && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Initializing smart account...
                  </span>
                </div>
              </div>
            )}

            {smartAccountError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">
                  Error: {smartAccountError.message}
                </p>
              </div>
            )}

            {predictedAddress && !smartAccountError && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-sm font-medium text-indigo-900 mb-2">
                  Smart Account Address:
                </p>
                <p className="text-xs text-gray-700 font-mono break-all">
                  {predictedAddress}
                </p>
              </div>
            )}

            {/* Deploy Button */}
            <button
              onClick={handleDeploy}
              disabled={isDeploying || isInitializing || !!smartAccountError}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Deploying Wallet...
                </>
              ) : (
                "Deploy Smart Wallet"
              )}
            </button>

            {/* Disconnect Button */}
            <button
              onClick={() => disconnect()}
              disabled={isDeploying}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Disconnect Wallet
            </button>

            {/* Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-600 text-center">
                Deploying will create your smart contract wallet on-chain.
                You'll need to sign a transaction and pay gas fees.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}