import axios from 'axios';

interface Config {
    zcash: {
        rpcUrl: string;
        bridgeAddress: string;
        minConfirmations: number;
    };
}

interface ZcashDeposit {
    txid: string;
    amount: number;
    confirmations: number;
}

async function zcashRpc(
    rpcUrl: string,
    method: string,
    params: any[] = []
): Promise<any> {
    try {
        console.log(`🔗 Calling ${method} on ${rpcUrl}`);
        
        const response = await axios.post(
            rpcUrl,
            {
                jsonrpc: '2.0',
                id: 'relayer',
                method: method,
                params: params
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.error) {
            throw new Error(response.data.error.message || 'RPC error');
        }

        return response.data.result;
    } catch (error: any) {
        console.error(`❌ RPC error (${method}):`, error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
}

async function checkZcashDeposits(config: any): Promise<ZcashDeposit[]> {
    try {
        console.log('🔍 Scanning recent blocks...');
        
        const blockCount = await zcashRpc(config.zcash.rpcUrl, 'getblockcount', []);
        console.log(`Current height: ${blockCount}`);
        
        const deposits: ZcashDeposit[] = [];
        
        // Scan last 10 blocks
        for (let height = blockCount - 10; height <= blockCount; height++) {
            const blockHash = await zcashRpc(config.zcash.rpcUrl, 'getblockhash', [height]);
            const block = await zcashRpc(config.zcash.rpcUrl, 'getblock', [blockHash, 2]);
            
            for (const tx of block.tx) {
                if (!tx.vout) continue;
                
                for (const vout of tx.vout) {
                    const addresses = vout.scriptPubKey?.addresses || [];
                    
                    if (addresses.includes(config.zcash.bridgeAddress)) {
                        deposits.push({
                            txid: tx.txid,
                            amount: Math.round(vout.value * 100000000),
                            confirmations: blockCount - height + 1
                        });
                        
                        console.log(`Found: ${tx.txid} - ${vout.value} ZEC`);
                    }
                }
            }
        }
        
        return deposits;
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        return [];
    }
}

async function main() {
    const config = require('../config.json');
    await checkZcashDeposits(config);
}

main();