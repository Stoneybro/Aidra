// src/config.ts
import * as fs from 'fs';
import { Config } from './types';
import 'dotenv/config';

/**
 * Loads configuration from config.json
 * @returns Parsed configuration object
 */
export function loadConfig(): Config {
  try {
    const configFile = fs.readFileSync('./config.json', 'utf-8');
    const config: Config = JSON.parse(configFile);
    
    // Validate required fields
    if (!config.zcash.bridgeAddress) {
      throw new Error('Missing zcash.bridgeAddress in config');
    }
    if (!config.evm.bridgeExecutorAddress) {
      throw new Error('Missing evm.bridgeExecutorAddress in config');
    }
    if (!process.env.EVM_PRIVATE_KEY) {
      throw new Error('Missing evm.privateKey in config');
    }
    if (!process.env.ZCASH_PRIVATE_KEY) {
      throw new Error('Missing zcash.privateKey in config');
    }
    
    console.log('✅ Configuration loaded successfully');
    return config;
  } catch (error) {
    console.error('❌ Failed to load config.json:', error);
    process.exit(1); // Exit if config is invalid
  }
}