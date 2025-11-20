import axios from 'axios';
import { Config, ZcashDeposit, ParsedMemo } from './types';
import { isDepositProcessed, logMessage } from './stateManager';

/**
 * Makes RPC call to Zcash node
 */
async function zcashRpc(
  config: Config,
  method: string,
  params: any[]
): Promise<any> {
  try {
    const response = await axios.post(
      config.zcash.rpcUrl,
      {
        jsonrpc: '1.0',
        id: 'relayer',
        method: method,
        params: params
      },
      {
        auth: {
          username: config.zcash.rpcUser,
          password: config.zcash.rpcPassword
        }
      }
    );
    
    return response.data.result;
  } catch (error: any) {
    console.error(`❌ Zcash RPC error (${method}):`, error.message);
    throw error;
  }
}

/**
 * Parses memo string into components
 * Format: "0xAABB...|NEAR|alice.near|ztestsapling1..."
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
 * Checks for new Zcash deposits
 */
export async function checkZcashDeposits(config: Config): Promise<ZcashDeposit[]> {
  try {
    const deposits = await zcashRpc(config, 'z_listreceivedbyaddress', [
      config.zcash.bridgeAddress,
      config.zcash.minConfirmations
    ]);
    
    const newDeposits: ZcashDeposit[] = [];
    
    for (const deposit of deposits) {
      const txid = deposit.txid;
      
      // Check DB if already processed
      if (await isDepositProcessed(txid)) {
        continue;
      }
      
      const memo = deposit.memo ? 
        Buffer.from(deposit.memo, 'hex').toString('utf-8') : '';
      
      newDeposits.push({
        txid: txid,
        amount: Math.floor(deposit.amount * 100000000),
        confirmations: deposit.confirmations,
        memo: memo
      });
    }
    
    if (newDeposits.length > 0) {
      console.log(`🔍 Found ${newDeposits.length} new deposit(s)`);
      await logMessage('info', `Found ${newDeposits.length} new deposits`);
    }
    
    return newDeposits;
  } catch (error: any) {
    await logMessage('error', 'Error checking Zcash deposits', { error: error.message });
    return [];
  }
}

/**
 * Sends ZEC from bridge custody to destination address
 * Used for forwarding to 1Click or refunds
 */
export async function sendZcash(
  config: Config,
  toAddress: string,
  amount: number, // zatoshis
  memo?: string
): Promise<string> {
  try {
    // Convert zatoshis to ZEC
    const amountZec = amount / 100000000;
    
    // Prepare z_sendmany parameters
    const outputs = [{
      address: toAddress,
      amount: amountZec,
      ...(memo && { memo: Buffer.from(memo).toString('hex') })
    }];
    
    // Execute send
    const opid = await zcashRpc(config, 'z_sendmany', [
      config.zcash.bridgeAddress, // from our custody
      outputs,
      1, // minconf
      0.0001 // fee
    ]);
    
    console.log(`📤 Sent ${amountZec} ZEC to ${toAddress}, opid: ${opid}`);
    
    // Wait for operation to complete
    let status = await zcashRpc(config, 'z_getoperationstatus', [[opid]]);
    
    while (status[0].status === 'executing') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await zcashRpc(config, 'z_getoperationstatus', [[opid]]);
    }
    
    if (status[0].status === 'success') {
      return status[0].result.txid;
    } else {
      throw new Error(`Send failed: ${status[0].error.message}`);
    }
  } catch (error: any) {
    console.error('❌ Failed to send ZEC:', error.message);
    throw error;
  }
}