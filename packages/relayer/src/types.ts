export interface ZcashTransaction {
    txid: string;
    amount: number;
    address: string;
    confirmations: number;
    blockheight: number;
    time: number;
    txdetails: {
        vout: Array<{
            value: number;
            scriptPubKey: {
                addresses: string[];
            };
        }>;
    };
}

export interface NearTransaction {
    signer_id: string;
    receiver_id: string;
    actions: Array<{
        Transfer: {
            deposit: string;
        };
    }>;
    hash: string;
    block_hash: string;
    block_timestamp: number;
}

export interface BridgeEvent {
    type: 'Deposit' | 'Withdraw';
    from: string;
    to: string;
    amount: string;
    txHash: string;
    blockNumber: number;
    timestamp: number;
}
