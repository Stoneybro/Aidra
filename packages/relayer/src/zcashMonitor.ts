
import axios from 'axios';
import { Config, ZcashDeposit, ParsedMemo } from './types';
import { isDepositProcessed, logMessage } from './stateManager';
import { sendTransparentZec } from './zcashSigner';

/**
 * Makes RPC call to Zcash node (GetBlock)
 */
async function zcashRpc(
  config: Config,
  method: string,
  params: any[]
): Promise<any> {
  try {
    // GetBlock uses access token in URL, no auth needed
    const response = await axios.post(
      config.zcash.rpcUrl,
      {
        jsonrpc: '1.0',
        id: 'relayer',
        method: method,
        params: params
      }
      // ❌ No auth needed - token is in URL!
    );
    
    return response.data.result;
  } catch (error: any) {
    console.error(`❌ Zcash RPC error (${method}):`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Parses memo string into components
 * Format: "0xAABB...|NEAR|alice.near|t1refund..."
 */
export function parseMemo(memo: string): ParsedMemo | null {
  try {
    const parts = memo.split('|');
    
    if (parts.length !== 4) {
      console.warn('⚠️  Invalid memo format:', memo);
      return null;
    }
    
    return {
      aaWallet: parts[0].trim(),
      destinationChain: parts[1].trim(),
      recipientAddress: parts[2].trim(),
      refundAddress: parts[3].trim()
    };
  } catch (error) {
    console.error('❌ Failed to parse memo:', error);
    return null;
  }
}

/**
 * Checks for new Zcash deposits (transparent)
 */
export async function checkZcashDeposits(config: Config): Promise<ZcashDeposit[]> {
  try {
    // For TRANSPARENT addresses, use listreceivedbyaddress
    const transactions = await zcashRpc(config, 'listreceivedbyaddress', [
      config.zcash.minConfirmations,
      false, // include empty
      true   // include watchonly
    ]);
    
    const newDeposits: ZcashDeposit[] = [];
    
    for (const tx of transactions) {
      // Only process deposits to our bridge address
      if (tx.address !== config.zcash.bridgeAddress) continue;
      
      // Get transaction details
      const txDetails = await zcashRpc(config, 'gettransaction', [tx.txid]);
      
      // Check if already processed
      if (await isDepositProcessed(tx.txid)) {
        continue;
      }
      
      newDeposits.push({
        txid: tx.txid,
        amount: Math.floor(tx.amount * 100000000), // Convert to zatoshis
        confirmations: tx.confirmations,
        memo: '' // Transparent txs don't have memos in standard format
      });
    }
    
    if (newDeposits.length > 0) {
      console.log(`🔍 Found ${newDeposits.length} new deposit(s)`);
      await logMessage('info', `Found ${newDeposits.length} new deposits`);
    }
    console.log("List of new deposits:", newDeposits);
    
    
    return newDeposits;
  } catch (error: any) {
    console.error('❌ Error checking deposits:', error.message);
    await logMessage('error', 'Error checking Zcash deposits', { error: error.message });
    return [];
  }
}

/**
 * Sends ZEC using Maya Protocol signing
 */
export async function sendZcash(
  config: Config,
  toAddress: string,
  amount: number, // zatoshis
  memo?: string
): Promise<string> {
  try {
    // Use Maya Protocol client-side signing
    return await sendTransparentZec(config, toAddress, amount, memo);
  } catch (error: any) {
    console.error('❌ Failed to send ZEC:', error.message);
    throw error;
  }
}