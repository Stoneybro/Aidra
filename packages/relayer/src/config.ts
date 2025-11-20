// src/config.ts
import * as fs from 'fs';
import { Config } from './types';

/**
 * Loads configuration from config.json
 * @returns Parsed configuration object
 */
const PRIVATE_KEY = process.env.PRIVATE_KEY;
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
    if (!PRIVATE_KEY) {
      throw new Error('Missing evm.privateKey in config');
    }
    
    console.log('✅ Configuration loaded successfully');
    return config;
  } catch (error) {
    console.error('❌ Failed to load config.json:', error);
    process.exit(1); // Exit if config is invalid
  }
}