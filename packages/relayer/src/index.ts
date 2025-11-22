import 'dotenv/config';
import { loadConfig } from './config';
import { initDatabase } from './db';
import { checkZcashDeposits, parseMemo } from './zcashMonitor';
import { submitBridgeToEVM } from './bridgeSubmitter';
import { startEventListener } from './eventListeners';
import { startApi } from './api';
import { logMessage } from './stateManager';


const API_PORT = parseInt(process.env.RELAYER_API_PORT || '3001');

/**
 * Main relayer loop - monitors Zcash for deposits
 * This is a fallback for detecting deposits via memo
 * Primary flow is via API submission from frontend
 */
async function zcashMonitorLoop(config: any) {
  console.log('\n🔍 Starting Zcash monitor loop (background)...');
  console.log('   Note: Primary deposit detection is via /submit-bridge API');
  
  while (true) {
    try {
      // Check for new deposits (for memo-based detection as fallback)
      const deposits = await checkZcashDeposits(config);
      
      // Process each deposit that has a valid memo
      for (const deposit of deposits) {
        // Skip if no memo (these should come via API)
        if (!deposit.memo) {
          console.log(`ℹ️  Deposit ${deposit.txid} has no memo, waiting for API submission`);
          continue;
        }
        
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
  
  // Start API server (for frontend submissions)
  await startApi(config, API_PORT);
  
  // Start event listener (runs in background)
  const stopEventListener = await startEventListener(config);
  
  // Start Zcash monitor (background loop for memo-based detection)
  // Run in background, don't block
  zcashMonitorLoop(config).catch((error) => {
    console.error('💥 Zcash monitor crashed:', error);
  });
  
  console.log('\n✅ Relayer fully operational!');
  console.log('─'.repeat(50));
  console.log('📋 Components:');
  console.log(`   • API Server:     http://localhost:${API_PORT}`);
  console.log(`   • Event Listener: Watching BridgeExecutor`);
  console.log(`   • Zcash Monitor:  Polling every ${config.zcash.pollInterval}ms`);
  console.log(`   • Bridge Address: ${config.zcash.bridgeAddress}`);
  console.log('─'.repeat(50));
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n👋 Shutting down relayer...');
    stopEventListener();
    await logMessage('info', 'Relayer stopped');
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
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