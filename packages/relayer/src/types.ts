/**
 * Configuration loaded from config.json
 */
export interface Config {
  zcash: {
    rpcUrl: string;
    rpcUser: string;
    rpcPassword: string;
    bridgeAddress: string;
    minConfirmations: number;
    pollInterval: number; // milliseconds
  };
  evm: {
    rpcUrl: string;
    bridgeExecutorAddress: string;
    policyContractAddress: string;

    chainId: number;
  };
  nearOneClick: {
    apiUrl: string; // https://1click.chaindefuser.com
    useApiKey: boolean;
    apiKey?: string; // Optional
  };
  retryConfig: {
    maxRetries: number;
    retryDelayMs: number;
  };
}

/**
 * Zcash deposit detected by monitor
 */
export interface ZcashDeposit {
  txid: string; // Zcash transaction ID
  amount: number; // Amount in zatoshis
  confirmations: number;
  memo: string; // Raw memo string
}
/**
 * Parsed memo components
 */
export interface ParsedMemo {
  aaWallet: string; // 0xAABB...
  destinationChain: string; // "NEAR"
  recipientAddress: string; // "alice.near"
  refundAddress: string; // "ztestsapling1..."
}
/**
 * State tracked by relayer (saved to state.json)
 */
export interface RelayerState {
  processedDeposits: {
    [zcashTxHash: string]: {
      processed: boolean;
      evmTxHash?: string; // EVM tx that submitted it
      timestamp: number;
    };
  };
  pendingSwaps: {
    [zcashTxHash: string]: {
      status: 'pending' | 'executing' | 'completed' | 'failed';
      retryCount: number;
      lastAttempt: number;
      oneClickDepositAddress?: string;
    };
  };
}
/**
 * 1Click API quote response
 */
export interface OneClickQuote {
  depositAddress: string; // Where to send ZEC
  depositMemo?: string;
  amountOut: string; // Expected NEAR amount
  minAmountOut: string;
  deadline: string;
  timeEstimate: number; // seconds
}

/**
 * 1Click API status response
 */
export interface OneClickStatus {
  status: 'PENDING_DEPOSIT' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  transactionId?: string; // NEAR tx ID if completed
  error?: string;
}
