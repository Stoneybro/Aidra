import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Create/open SQLite database file
const sqlite = new Database('./relayer.db');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Initialize tables (create if not exist)
export function initDatabase() {
  try {
    // Tables auto-created by Drizzle on first use
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}