import { createConfig, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(), // MetaMask, Rabby, Browser wallets

  ],
  transports: {
    [baseSepolia.id]: http(),
  },
})