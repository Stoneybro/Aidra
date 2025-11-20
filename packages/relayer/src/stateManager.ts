import { db } from "./db";
import { processedDeposits,pendingSwaps,relayerLogs } from "./db/schema";
import { eq } from "drizzle-orm";

/**
 * Marks a Zcash deposit as processed
 */
export async function markDepositProcessed(
  zcashTxHash: string,
  evmTxHash: string,
  amount: number
): Promise<void> {
  try {
    await db.insert(processedDeposits).values({
      zcashTxHash,
      evmTxHash,
      amount,
      timestamp: Date.now(),
      processed: true
    });
    console.log(`✅ Marked ${zcashTxHash} as processed`);
  } catch (error) {
    console.error('❌ Failed to mark deposit as processed:', error);
  }
}

/**
 * Checks if deposit was already processed
 */
export async function isDepositProcessed(zcashTxHash: string): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(processedDeposits)
      .where(eq(processedDeposits.zcashTxHash, zcashTxHash))
      .limit(1);
    
    return result.length > 0;
  } catch (error) {
    console.error('❌ Error checking deposit status:', error);
    return false;
  }
}

/**
 * Creates or updates a pending swap
 */
export async function upsertPendingSwap(
  zcashTxHash: string,
  data: {
    status: 'pending' | 'executing' | 'completed' | 'failed';
    destinationChain: string;
    recipientAddress: string;
    amount: number;
    oneClickDepositAddress?: string;
  }
): Promise<void> {
  try {
    // Check if exists
    const existing = await db
      .select()
      .from(pendingSwaps)
      .where(eq(pendingSwaps.zcashTxHash, zcashTxHash))
      .limit(1);
    
    if (existing.length > 0) {
      // Update
      await db
        .update(pendingSwaps)
        .set({
          status: data.status,
          lastAttempt: Date.now(),
          ...(data.oneClickDepositAddress && { 
            oneClickDepositAddress: data.oneClickDepositAddress 
          })
        })
        .where(eq(pendingSwaps.zcashTxHash, zcashTxHash));
    } else {
      // Insert
      await db.insert(pendingSwaps).values({
        zcashTxHash,
        status: data.status,
        destinationChain: data.destinationChain,
        recipientAddress: data.recipientAddress,
        amount: data.amount,
        retryCount: 0,
        lastAttempt: Date.now(),
        oneClickDepositAddress: data.oneClickDepositAddress
      });
    }
    
    console.log(`✅ Updated swap ${zcashTxHash}: ${data.status}`);
  } catch (error) {
    console.error('❌ Failed to upsert pending swap:', error);
  }
}

/**
 * Gets pending swap info
 */
export async function getPendingSwap(zcashTxHash: string) {
  try {
    const result = await db
      .select()
      .from(pendingSwaps)
      .where(eq(pendingSwaps.zcashTxHash, zcashTxHash))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error('❌ Error getting pending swap:', error);
    return null;
  }
}

/**
 * Increments retry count for a swap
 */
export async function incrementRetryCount(zcashTxHash: string): Promise<number> {
  try {
    const swap = await getPendingSwap(zcashTxHash);
    if (!swap) return 0;
    
    const newCount = swap.retryCount + 1;
    
    await db
      .update(pendingSwaps)
      .set({ retryCount: newCount })
      .where(eq(pendingSwaps.zcashTxHash, zcashTxHash));
    
    return newCount;
  } catch (error) {
    console.error('❌ Error incrementing retry count:', error);
    return 0;
  }
}

/**
 * Gets all pending swaps that need retry
 */
export async function getSwapsNeedingRetry(maxRetries: number) {
  try {
    const oneHourAgo = Date.now() - 3600000;
    
    const results = await db
      .select()
      .from(pendingSwaps)
      .where(eq(pendingSwaps.status, 'pending'));
    
    return results.filter(swap => 
      swap.retryCount < maxRetries && 
      swap.lastAttempt < oneHourAgo
    );
  } catch (error) {
    console.error('❌ Error getting swaps needing retry:', error);
    return [];
  }
}

/**
 * Logs a message to database
 */
export async function logMessage(
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: any
): Promise<void> {
  try {
    await db.insert(relayerLogs).values({
      timestamp: Date.now(),
      level,
      message,
      data: data ? JSON.stringify(data) : null
    });
  } catch (error) {
    console.error('❌ Failed to log message:', error);
  }
}