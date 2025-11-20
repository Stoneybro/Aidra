import { sqliteTable,text,integer } from "drizzle-orm/sqlite-core";

/**
 * Tracks processed Zcash deposits
 */
export const processedDeposits = sqliteTable('processed_deposits', {
  zcashTxHash: text('zcash_tx_hash').primaryKey(),
  evmTxHash: text('evm_tx_hash'),
  amount: integer('amount').notNull(), // zatoshis
  timestamp: integer('timestamp').notNull(),
  processed: integer('processed', { mode: 'boolean' }).notNull().default(true)
});

/**
 * Tracks pending cross-chain swaps
 */
export const pendingSwaps = sqliteTable('pending_swaps', {
  zcashTxHash: text('zcash_tx_hash').primaryKey(),
  status: text('status').notNull(), // 'pending' | 'executing' | 'completed' | 'failed'
  retryCount: integer('retry_count').notNull().default(0),
  lastAttempt: integer('last_attempt').notNull(),
  oneClickDepositAddress: text('oneclick_deposit_address'),
  destinationChain: text('destination_chain').notNull(),
  recipientAddress: text('recipient_address').notNull(),
  amount: integer('amount').notNull()
});

/**
 * Logs for debugging
 */
export const relayerLogs = sqliteTable('relayer_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: integer('timestamp').notNull(),
  level: text('level').notNull(), // 'info' | 'warn' | 'error'
  message: text('message').notNull(),
  data: text('data') // JSON string for extra data
});