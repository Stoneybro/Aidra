import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  Address
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { Config, ZcashDeposit, ParsedMemo } from './types';
import { markDepositProcessed, logMessage } from './stateManager';
import 'dotenv/config';
const BRIDGE_EXECUTOR_ABI = parseAbi([
  'function initiateBridge(address aaWallet, string calldata destinationChain, uint256 amount, bytes32 zcashTxHash, string calldata recipientAddress, string calldata zcashRefundAddress, bytes calldata proof) external'
]);


/**
 * Submits a Zcash deposit to EVM BridgeExecutor
 */
export async function submitBridgeToEVM(
  config: Config,
  deposit: ZcashDeposit,
  parsed: ParsedMemo
): Promise<string | null> {
  try {
    console.log(`\n📡 Submitting to EVM:`);
    console.log(`   Zcash TX: ${deposit.txid}`);
    console.log(`   AA Wallet: ${parsed.aaWallet}`);
    console.log(`   Chain: ${parsed.destinationChain}`);
    console.log(`   Recipient: ${parsed.recipientAddress}`);
    
    // Create clients
    const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
    
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
    
    // Mock proof for hackathon
    const mockProof = '0x' + '00'.repeat(32);
    
    // Call initiateBridge
    const hash = await walletClient.writeContract({
      address: config.evm.bridgeExecutorAddress as Address,
      abi: BRIDGE_EXECUTOR_ABI,
      functionName: 'initiateBridge',
      args: [
        parsed.aaWallet as Address,
        parsed.destinationChain,
        BigInt(deposit.amount),
        deposit.txid as `0x${string}`,
        parsed.recipientAddress,
        parsed.refundAddress,
        mockProof as `0x${string}`
      ],
      account
    });
    
    console.log(`✅ EVM tx sent: ${hash}`);
    
    await logMessage('info', 'Bridge submitted to EVM', {
      zcashTxHash: deposit.txid,
      evmTxHash: hash
    });
    
    // Mark as processed in DB
    await markDepositProcessed(deposit.txid, hash, deposit.amount);
    
    return hash;
  } catch (error: any) {
    console.error('❌ Failed to submit to EVM:', error.message);
    await logMessage('error', 'EVM submission failed', {
      zcashTxHash: deposit.txid,
      error: error.message
    });
    return null;
  }
}
