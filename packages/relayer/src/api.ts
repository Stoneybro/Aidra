import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { Config, ParsedMemo } from './types';
import { isDepositProcessed, logMessage, upsertPendingSwap } from './stateManager';
import { submitBridgeToEVM } from './bridgeSubmitter';

const app = express();
app.use(cors());
app.use(express.json());

let config: Config;

/**
 * Verifies a Zcash transaction exists on the network
 */
async function verifyZcashTx(txid: string): Promise<{ exists: boolean; amount?: number; confirmations?: number }> {
  try {
    const response = await axios.post(
      config.zcash.rpcUrl,
      {
        jsonrpc: '1.0',
        id: 'relayer',
        method: 'gettransaction',
        params: [txid]
      }
    );

    if (response.data.error) {
      return { exists: false };
    }

    const tx = response.data.result;
    
    // Find output to bridge address
    let bridgeAmount = 0;
    for (const detail of tx.details || []) {
      if (detail.address === config.zcash.bridgeAddress && detail.category === 'receive') {
        bridgeAmount = Math.floor(detail.amount * 100000000); // Convert to zatoshis
      }
    }

    return {
      exists: true,
      amount: bridgeAmount,
      confirmations: tx.confirmations
    };
  } catch (error: any) {
    console.error('Error verifying tx:', error.message);
    return { exists: false };
  }
}

/**
 * POST /submit-bridge
 * Frontend calls this after user sends ZEC to bridge address
 */
app.post('/submit-bridge', async (req: Request, res: Response) => {
  try {
    const { zcashTxId, aaWallet, destinationChain, recipientAddress, refundAddress } = req.body;

    // Validate required fields
    if (!zcashTxId || !aaWallet || !destinationChain || !recipientAddress || !refundAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['zcashTxId', 'aaWallet', 'destinationChain', 'recipientAddress', 'refundAddress']
      });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(aaWallet)) {
      return res.status(400).json({ error: 'Invalid aaWallet address format' });
    }

    // Check if already processed
    if (await isDepositProcessed(zcashTxId)) {
      return res.status(400).json({ error: 'Transaction already processed' });
    }

    // Verify transaction exists on Zcash network
    console.log(`🔍 Verifying Zcash tx: ${zcashTxId}`);
    const txVerification = await verifyZcashTx(zcashTxId);

    if (!txVerification.exists) {
      return res.status(400).json({ 
        error: 'Transaction not found on Zcash network',
        hint: 'Please wait for the transaction to be broadcast and try again'
      });
    }

    if (!txVerification.amount || txVerification.amount === 0) {
      return res.status(400).json({ 
        error: 'Transaction does not contain output to bridge address',
        bridgeAddress: config.zcash.bridgeAddress
      });
    }

    // Check confirmations
    if (txVerification.confirmations! < config.zcash.minConfirmations) {
      return res.status(400).json({ 
        error: `Insufficient confirmations. Need ${config.zcash.minConfirmations}, have ${txVerification.confirmations}`,
        confirmations: txVerification.confirmations,
        required: config.zcash.minConfirmations,
        hint: 'Please wait for more confirmations and try again'
      });
    }

    console.log(`✅ Verified: ${txVerification.amount} zatoshis with ${txVerification.confirmations} confirmations`);

    // Store in pending swaps
    await upsertPendingSwap(zcashTxId, {
      status: 'pending',
      destinationChain,
      recipientAddress,
      amount: txVerification.amount
    });

    // Log the submission
    await logMessage('info', 'Bridge request submitted via API', {
      zcashTxId,
      aaWallet,
      destinationChain,
      amount: txVerification.amount
    });

    // Submit to EVM
    const parsedMemo: ParsedMemo = {
      aaWallet,
      destinationChain,
      recipientAddress,
      refundAddress
    };

    const evmTxHash = await submitBridgeToEVM(
      config,
      {
        txid: zcashTxId,
        amount: txVerification.amount,
        confirmations: txVerification.confirmations!,
        memo: '' // Not used when submitting via API
      },
      parsedMemo
    );

    if (!evmTxHash) {
      return res.status(500).json({ error: 'Failed to submit to EVM contract' });
    }

    return res.json({
      success: true,
      message: 'Bridge request submitted successfully',
      zcashTxId,
      evmTxHash,
      amount: txVerification.amount,
      destinationChain,
      recipientAddress
    });

  } catch (error: any) {
    console.error('❌ Error in /submit-bridge:', error);
    await logMessage('error', 'API error in /submit-bridge', { error: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /status/:txid
 * Check status of a bridge operation
 */
app.get('/status/:txid', async (req: Request, res: Response) => {
  try {
    const { txid } = req.params;
    
    // Import here to avoid circular dependency
    const { getPendingSwap } = await import('./stateManager');
    const swap = await getPendingSwap(txid);

    if (!swap) {
      return res.status(404).json({ error: 'Bridge operation not found' });
    }

    return res.json({
      zcashTxId: swap.zcashTxHash,
      status: swap.status,
      destinationChain: swap.destinationChain,
      recipientAddress: swap.recipientAddress,
      amount: swap.amount,
      retryCount: swap.retryCount
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    bridgeAddress: config?.zcash?.bridgeAddress 
  });
});

/**
 * GET /config
 * Returns public config (bridge address, supported chains)
 */
app.get('/config', (req: Request, res: Response) => {
  res.json({
    zcashBridgeAddress: config.zcash.bridgeAddress,
    minConfirmations: config.zcash.minConfirmations,
    supportedChains: ['NEAR'], // Add more as supported
    evmChainId: config.evm.chainId
  });
});

/**
 * Start the API server
 */
export function startApi(cfg: Config, port: number = 3001): Promise<void> {
  config = cfg;
  
  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`\n🌐 API server running on http://localhost:${port}`);
      console.log(`   POST /submit-bridge - Submit bridge request`);
      console.log(`   GET  /status/:txid  - Check bridge status`);
      console.log(`   GET  /health        - Health check`);
      console.log(`   GET  /config        - Public config\n`);
      resolve();
    });
  });
}

export default app;