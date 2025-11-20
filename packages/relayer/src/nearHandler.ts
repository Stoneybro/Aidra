import axios from 'axios';
import { Config, OneClickQuote, OneClickStatus } from './types';
import { logMessage } from './stateManager';

/**
 * Gets a swap quote from NEAR 1Click API
 */
export async function getOneClickQuote(
  config: Config,
  amountZatoshis: number,
  recipientAddress: string
): Promise<OneClickQuote | null> {
  try {
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    if (config.nearOneClick.useApiKey && config.nearOneClick.apiKey) {
      headers['Authorization'] = `Bearer ${config.nearOneClick.apiKey}`;
    }
    
    const response = await axios.post(
      `${config.nearOneClick.apiUrl}/v0/quote`,
      {
        originAsset: 'zec', // Zcash
        destinationAsset: 'nep141:wrap.near', // Wrapped NEAR
        swapType: 'EXACT_INPUT',
        amount: amountZatoshis.toString(), // 1Click expects string
        slippageTolerance: 100, // 1%
        recipient: recipientAddress,
        refundTo: recipientAddress, // Refund to same address if fails
        depositType: 'ORIGIN_CHAIN', // We send ZEC on Zcash
        recipientType: 'DESTINATION_CHAIN', // Receive on NEAR
        deadline: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      },
      { headers }
    );
    
    const quote = response.data.quote;
    
    console.log(`📊 1Click Quote: ${amountZatoshis} zatoshis → ${quote.amountOut} NEAR`);
    console.log(`   Deposit to: ${quote.depositAddress}`);
    
    await logMessage('info', '1Click quote received', {
      depositAddress: quote.depositAddress,
      amountOut: quote.amountOut
    });
    
    return {
      depositAddress: quote.depositAddress,
      depositMemo: quote.depositMemo,
      amountOut: quote.amountOut,
      minAmountOut: quote.minAmountOut,
      deadline: quote.deadline,
      timeEstimate: quote.timeEstimate
    };
  } catch (error: any) {
    console.error('❌ Failed to get 1Click quote:', error.response?.data || error.message);
    await logMessage('error', 'Failed to get 1Click quote', {
      error: error.response?.data || error.message
    });
    return null;
  }
}

/**
 * Checks swap status from 1Click API
 */
export async function checkOneClickStatus(
  config: Config,
  depositAddress: string
): Promise<OneClickStatus | null> {
  try {
    const headers: any = {};
    
    if (config.nearOneClick.useApiKey && config.nearOneClick.apiKey) {
      headers['Authorization'] = `Bearer ${config.nearOneClick.apiKey}`;
    }
    
    const response = await axios.get(
      `${config.nearOneClick.apiUrl}/v0/status`,
      {
        params: { depositAddress },
        headers
      }
    );
    
    return {
      status: response.data.status,
      transactionId: response.data.transactionId,
      error: response.data.error
    };
  } catch (error: any) {
    console.error('❌ Failed to check 1Click status:', error.message);
    return null;
  }
}

/**
 * Polls 1Click status until completion or timeout
 * @returns Final status or null if timeout
 */
export async function pollOneClickStatus(
  config: Config,
  depositAddress: string,
  timeoutMinutes: number = 30
): Promise<OneClickStatus | null> {
  const startTime = Date.now();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  
  console.log(`⏳ Polling 1Click status for ${depositAddress}...`);
  
  while (Date.now() - startTime < timeoutMs) {
    const status = await checkOneClickStatus(config, depositAddress);
    
    if (!status) {
      // API error, wait and retry
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10s
      continue;
    }
    
    console.log(`   Status: ${status.status}`);
    
    // Check if final status
    if (status.status === 'SUCCESS' || status.status === 'FAILED' || status.status === 'REFUNDED') {
      await logMessage('info', `1Click swap ${status.status}`, {
        depositAddress,
        txId: status.transactionId
      });
      return status;
    }
    
    // Still processing, wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  // Timeout
  console.error('⏰ 1Click status check timed out');
  await logMessage('error', '1Click status timeout', { depositAddress });
  return null;
}

/**
 * Executes full NEAR bridge flow
 * 1. Get quote
 * 2. Send ZEC to 1Click deposit address
 * 3. Poll for completion
 * @returns NEAR transaction ID if successful, null if failed
 */
export async function executeNearBridge(
  config: Config,
  sendZcashFn: (toAddress: string, amount: number, memo?: string) => Promise<string>,
  amountZatoshis: number,
  recipientAddress: string
): Promise<{ success: boolean; nearTxId?: string; error?: string }> {
  try {
    // Step 1: Get quote
    console.log(`🌉 Starting NEAR bridge for ${amountZatoshis} zatoshis`);
    const quote = await getOneClickQuote(config, amountZatoshis, recipientAddress);
    
    if (!quote) {
      return { success: false, error: 'Failed to get quote' };
    }
    
    // Step 2: Send ZEC to 1Click deposit address
    console.log(`📤 Sending ZEC to 1Click deposit address...`);
    const zcashTxId = await sendZcashFn(
      quote.depositAddress,
      amountZatoshis,
      quote.depositMemo
    );
    
    console.log(`✅ ZEC sent, txid: ${zcashTxId}`);
    await logMessage('info', 'ZEC sent to 1Click', {
      zcashTxId,
      depositAddress: quote.depositAddress
    });
    
    // Step 3: Poll for completion
    const status = await pollOneClickStatus(config, quote.depositAddress, 30);
    
    if (!status) {
      return { success: false, error: 'Status check timeout' };
    }
    
    if (status.status === 'SUCCESS') {
      console.log(`✅ NEAR bridge completed! NEAR txid: ${status.transactionId}`);
      return { success: true, nearTxId: status.transactionId };
    } else {
      console.error(`❌ NEAR bridge failed: ${status.error}`);
      return { success: false, error: status.error || 'Bridge failed' };
    }
  } catch (error: any) {
    console.error('❌ Error executing NEAR bridge:', error.message);
    await logMessage('error', 'NEAR bridge execution failed', { error: error.message });
    return { success: false, error: error.message };
  }
}