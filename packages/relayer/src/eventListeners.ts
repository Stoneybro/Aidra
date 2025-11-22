// src/eventListener.ts
import {
    createPublicClient,
    createWalletClient,
    http,
    parseAbi,
    Address,
    WatchContractEventReturnType,
    decodeEventLog,
    Log
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { Config } from './types';
import { logMessage, upsertPendingSwap, getPendingSwap } from './stateManager';
import { executeNearBridge } from './nearHandler';
import { sendZcash } from './zcashMonitor';
import 'dotenv/config';
/**
 * Bridge Executor ABI (only events and functions we need)
 */
const BRIDGE_EXECUTOR_ABI = parseAbi([
    'event BridgeRequested(address indexed aaWallet, string destinationChain, uint256 amount, bytes32 indexed zcashTxHash, string recipientAddress, string zcashRefundAddress)',
    'event RefundRequested(address indexed aaWallet, uint256 amount, bytes32 indexed zcashTxHash)',
    'function completeBridge(bytes32 zcashTxHash, string calldata externalTxId) external',
    'function failBridge(bytes32 zcashTxHash, string calldata reason) external',
    'function confirmRefund(bytes32 zcashTxHash) external'
]);
const PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;
/**
 * Creates viem clients for reading and writing to EVM
 */
function createClients(config: Config) {
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

    // Public client for reading/watching events
    const publicClient = createPublicClient({
        chain: {
            id: config.evm.chainId,
            name: 'baseSepolia',
            network: 'baseSepolia',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: {
                default: { http: [config.evm.rpcUrl] },
                public: { http: [config.evm.rpcUrl] }
            }
        },
        transport: http(config.evm.rpcUrl)
    }); // Wallet client for sending transactions
    const walletClient = createWalletClient({
        account,
        chain: {
            id: config.evm.chainId,
            name: 'baseSepolia',
            network: 'baseSepolia',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: {
                default: { http: [config.evm.rpcUrl] },
                public: { http: [config.evm.rpcUrl] }
            }
        },
        transport: http(config.evm.rpcUrl)
    });

    return { publicClient, walletClient, account };
}

/**
 * Handles BridgeRequested event - executes the cross-chain swap
 */
async function handleBridgeRequested(
  config: Config,
  event: {
    aaWallet: Address;
    destinationChain: string;
    amount: bigint;
    zcashTxHash: `0x${string}`;
    recipientAddress: string;
    zcashRefundAddress: string;
  },
  walletClient: any,
  account: any
) {
  const { zcashTxHash, destinationChain, amount, recipientAddress, zcashRefundAddress } = event;
  
  console.log(`\n🌉 BridgeRequested event received:`);
  console.log(`   Zcash TX: ${zcashTxHash}`);
  console.log(`   Chain: ${destinationChain}`);
  console.log(`   Amount: ${amount.toString()} zatoshis`);
  console.log(`   Recipient: ${recipientAddress}`);
  
  await logMessage('info', 'BridgeRequested event', {
    zcashTxHash,
    destinationChain,
    amount: amount.toString()
  });
  
  // Update DB
  await upsertPendingSwap(zcashTxHash, {
    status: 'executing',
    destinationChain,
    recipientAddress,
    amount: Number(amount)
  });
  
  // Route to correct chain handler
  if (destinationChain === 'NEAR') {
    await executeNearBridgeWithRetry(
      config,
      zcashTxHash,
      Number(amount),
      recipientAddress,
      walletClient,
      account
    );
  } else {
    // Other chains not implemented yet
    console.warn(`⚠️  Chain ${destinationChain} not supported yet`);
    await completeBridgeOnEVM(
      config,
      zcashTxHash,
      'mock-tx-id',
      walletClient,
      account,
      false,
      `Chain ${destinationChain} not supported`
    );
  }
}

/**
 * Executes NEAR bridge with retry logic
 */
async function executeNearBridgeWithRetry(
  config: Config,
  zcashTxHash: string,
  amountZatoshis: number,
  recipientAddress: string,
  walletClient: any,
  account: any
) {
  const maxRetries = config.retryConfig.maxRetries;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n🔄 NEAR bridge attempt ${attempt}/${maxRetries}`);
    
    try {
      // Execute bridge
      const result = await executeNearBridge(
        config,
        (toAddr, amt, memo) => sendZcash(config, toAddr, amt, memo),
        amountZatoshis,
        recipientAddress
      );
      
      if (result.success) {
        // Success! Update EVM contract
        await completeBridgeOnEVM(
          config,
          zcashTxHash,
          result.nearTxId!,
          walletClient,
          account,
          true
        );
        return;
      } else {
        // Failed, but might retry
        console.error(`❌ Attempt ${attempt} failed: ${result.error}`);
        
        if (attempt === maxRetries) {
          // Final attempt failed
          await completeBridgeOnEVM(
            config,
            zcashTxHash,
            '',
            walletClient,
            account,
            false,
            result.error || 'Max retries exceeded'
          );
        } else {
          // Wait before retry
          console.log(`⏳ Waiting ${config.retryConfig.retryDelayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, config.retryConfig.retryDelayMs));
        }
      }
    } catch (error: any) {
      console.error(`❌ Exception on attempt ${attempt}:`, error.message);
      
      if (attempt === maxRetries) {
        await completeBridgeOnEVM(
          config,
          zcashTxHash,
          '',
          walletClient,
          account,
          false,
          error.message
        );
      } else {
        await new Promise(resolve => setTimeout(resolve, config.retryConfig.retryDelayMs));
      }
    }
  }
}

/**
 * Updates bridge status on EVM contract
 */
async function completeBridgeOnEVM(
  config: Config,
  zcashTxHash: string,
  externalTxId: string,
  walletClient: any,
  account: any,
  success: boolean,
  errorReason?: string
) {
  try {
    const functionName = success ? 'completeBridge' : 'failBridge';
    const args = success 
      ? [zcashTxHash as `0x${string}`, externalTxId]
      : [zcashTxHash as `0x${string}`, errorReason || 'Unknown error'];
    
    console.log(`📝 Calling ${functionName} on EVM...`);
    
    const hash = await walletClient.writeContract({
      address: config.evm.bridgeExecutorAddress as Address,
      abi: BRIDGE_EXECUTOR_ABI,
      functionName,
      args,
      account
    });
    
    console.log(`✅ EVM tx sent: ${hash}`);
    await logMessage('info', `Bridge ${success ? 'completed' : 'failed'} on EVM`, {
      zcashTxHash,
      evmTxHash: hash
    });
    
    // Update DB
    await upsertPendingSwap(zcashTxHash, {
      status: success ? 'completed' : 'failed',
      destinationChain: 'NEAR',
      recipientAddress: '',
      amount: 0
    });
  } catch (error: any) {
    console.error('❌ Failed to update EVM contract:', error.message);
    await logMessage('error', 'Failed to update EVM', {
      zcashTxHash,
      error: error.message
    });
  }
}

/**
 * Handles RefundRequested event - sends ZEC back to user
 */
async function handleRefundRequested(
  config: Config,
  event: {
    aaWallet: Address;
    amount: bigint;
    zcashTxHash: `0x${string}`;
  },
  walletClient: any,
  account: any,
  publicClient: any
) {
  const { zcashTxHash, amount } = event;
  
  console.log(`\n💸 RefundRequested event received:`);
  console.log(`   Zcash TX: ${zcashTxHash}`);
  console.log(`   Amount: ${amount.toString()} zatoshis`);
  
  await logMessage('info', 'RefundRequested event', {
    zcashTxHash,
    amount: amount.toString()
  });
  
  try {
    // Get refund address from bridge operation
    const operation = await publicClient.readContract({
      address: config.evm.bridgeExecutorAddress as Address,
      abi: BRIDGE_EXECUTOR_ABI,
      functionName: 'getOperation',
      args: [zcashTxHash]
    });
    
    const refundAddress = operation.zcashRefundAddress;
    
    console.log(`📤 Sending refund to ${refundAddress}...`);
    
    // Send ZEC back
    const zcashRefundTxId = await sendZcash(
      config,
      refundAddress,
      Number(amount),
      'Refund'
    );
    
    console.log(`✅ Refund sent: ${zcashRefundTxId}`);
    
    // Confirm refund on EVM
    const hash = await walletClient.writeContract({
      address: config.evm.bridgeExecutorAddress as Address,
      abi: BRIDGE_EXECUTOR_ABI,
      functionName: 'confirmRefund',
      args: [zcashTxHash],
      account
    });
    
    console.log(`✅ Refund confirmed on EVM: ${hash}`);
    await logMessage('info', 'Refund completed', {
      zcashTxHash,
      zcashRefundTxId,
      evmConfirmTxHash: hash
    });
  } catch (error: any) {
    console.error('❌ Failed to process refund:', error.message);
    await logMessage('error', 'Refund failed', {
      zcashTxHash,
      error: error.message
    });
  }
}

/**
 * Starts listening to EVM events
 */
export async function startEventListener(config: Config) {
  console.log('\n👂 Starting EVM event listener...');
  
  const { publicClient, walletClient, account } = createClients(config);
  
  // Watch BridgeRequested events
  const unwatch1 = publicClient.watchContractEvent({
    address: config.evm.bridgeExecutorAddress as Address,
    abi: BRIDGE_EXECUTOR_ABI,
    eventName: 'BridgeRequested',
    onLogs: async (logs) => {
      for (const log of logs) {
        await handleBridgeRequested(
          config,
          log.args as any,
          walletClient,
          account
        );
      }
    }
  });
  
  // Watch RefundRequested events
  const unwatch2 = publicClient.watchContractEvent({
    address: config.evm.bridgeExecutorAddress as Address,
    abi: BRIDGE_EXECUTOR_ABI,
    eventName: 'RefundRequested',
    onLogs: async (logs) => {
      for (const log of logs) {
        await handleRefundRequested(
          config,
          log.args as any,
          walletClient,
          account,
          publicClient
        );
      }
    }
  });
  
  console.log('✅ Event listener active');
  await logMessage('info', 'Event listener started');
  
  // Return cleanup function
  return () => {
    unwatch1();
    unwatch2();
    console.log('Event listener stopped');
  };
}

