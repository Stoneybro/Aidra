// app/providers.tsx
"use client";

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "sonner";
import { SmartAccountProvider } from '@/lib/SmartAccountProvider';
import { config } from '@/lib/wagmi';

const queryClient = new QueryClient();

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SmartAccountProvider>
          <Toaster position='top-center' />
          {children}
        </SmartAccountProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}