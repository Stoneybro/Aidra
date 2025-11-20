// src/index.ts
import { loadConfig } from './config';
import { initDatabase } from './db';
import { checkZcashDeposits } from './zcashMonitor';
import { parseMemo } from './zcashMonitor';
import { submitBridgeToEVM } from './bridgeSubmitter';
import { startEventListener } from './eventListeners';
import { logMessage } from './stateManager';

/**
 * Main relayer loop - monitors Zcash for deposits
 */
async function zcashMonitorLoop(config: any) {
  console.log('\n🔍 Starting Zcash monitor loop...');
  
  while (true) {
    try {
      // Check for new deposits
      const deposits = await checkZcashDeposits(config);
      
      // Process each deposit
      for (const deposit of deposits) {
        console.log(`\n📥 Processing deposit: ${deposit.txid}`);
        console.log(`   Amount: ${deposit.amount} zatoshis`);
        console.log(`   Confirmations: ${deposit.confirmations}`);
        console.log(`   Memo: ${deposit.memo}`);
        
        // Parse memo
        const parsed = parseMemo(deposit.memo);
        
        if (!parsed) {
          console.warn('⚠️  Invalid memo format, skipping');
          await logMessage('warn', 'Invalid memo format', { zcashTxHash: deposit.txid });
          continue;
        }
        
        // Submit to EVM
        await submitBridgeToEVM(config, deposit, parsed);
      }
    } catch (error: any) {
      console.error('❌ Error in Zcash monitor loop:', error.message);
      await logMessage('error', 'Zcash monitor error', { error: error.message });
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, config.zcash.pollInterval));
  }
}

/**
 * Main function - starts all relayer components
 */
async function main() {
  console.log('🚀 Starting Zcash Bridge Relayer...\n');
  
  // Load config
  const config = loadConfig();
  
  // Initialize database
  initDatabase();
  
  await logMessage('info', 'Relayer started');
  
  // Start event listener (runs in background)
  const stopEventListener = await startEventListener(config);
  
  // Start Zcash monitor (blocking loop)
  await zcashMonitorLoop(config);
  
  // Graceful shutdown (never reached in normal operation)
  process.on('SIGINT', async () => {
    console.log('\n\n👋 Shutting down relayer...');
    stopEventListener();
    await logMessage('info', 'Relayer stopped');
    process.exit(0);
  });
}

// Start relayer
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});