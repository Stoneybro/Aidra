// packages/relayer/src/zcashSigner.ts

import {
    buildTx,
    signAndFinalize,
    sendRawTransaction,
    getUTXOS
} from '@mayaprotocol/zcash-js';
import axios from 'axios';
import { Config } from './types';

/**
 * Get current block height from RPC
 */
async function getBlockHeight(rpcUrl: string): Promise<number> {
  try {
    const response = await axios.post(rpcUrl, {
      jsonrpc: '1.0',
      id: 'relayer',
      method: 'getblockcount',
      params: []
    });
    return response.data.result;
  } catch (error: any) {
    console.error('❌ Failed to get block height:', error.message);
    throw error;
  }
}

/**
 * Send transparent ZEC using Maya Protocol library
 */
export async function sendTransparentZec(
    config: Config,
    toAddress: string,
    amountZatoshis: number,
    memo?: string
): Promise<string> {
    try {
        const fromAddress = config.zcash.bridgeAddress;
        const privateKeyWIF = process.env.ZCASH_PRIVATE_KEY!;

        console.log(`📤 Sending ${amountZatoshis / 1e8} ZEC to ${toAddress}...`);
        if (memo) console.log(`   Memo: ${memo}`);

        // Maya config
        const mayaConfig = {
            server: {
                host: config.zcash.rpcUrl, // GetBlock URL with token
                user: '',
                password: ''
            },
            mainnet: false // ✅ TESTNET
        };

        // Get UTXOs
        console.log('🔍 Fetching UTXOs...');
        const utxos = await getUTXOS(fromAddress, mayaConfig);
        console.log(`   Found ${utxos.length} UTXOs`);

        if (utxos.length === 0) {
            throw new Error('No UTXOs available (insufficient balance)');
        }

        // Get current block height
        console.log('📊 Fetching block height...');
        const blockHeight = await getBlockHeight(config.zcash.rpcUrl);
        console.log(`   Block height: ${blockHeight}`);

        // Build transaction
        console.log('🔨 Building transaction...');
        const tx = await buildTx(
            blockHeight,
            fromAddress,
            toAddress,
            amountZatoshis,
            utxos,
            false // no memo support for transparent
        );

        console.log('✍️  Signing transaction...');
        // Sign transaction
        const signedTx = await signAndFinalize(
            tx.height,
            privateKeyWIF,
            tx.inputs,
            tx.outputs
        );

        console.log('📡 Broadcasting transaction...');
        // Broadcast
        const txid = await sendRawTransaction(signedTx, mayaConfig);

        console.log('✅ Transaction sent successfully!');
        console.log(`   TXID: ${txid}`);
        console.log(`   Explorer: https://explorer.zcha.in/transactions/${txid}`);

        return txid;

    } catch (error: any) {
        console.error('❌ Failed to send ZEC:', error.message);
        if (error.response?.data) {
            console.error('   RPC Error:', error.response.data);
        }
        throw error;
    }
}