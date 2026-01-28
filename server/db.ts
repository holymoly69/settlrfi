import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Log database status but don't throw - let server start for health checks
if (!process.env.DATABASE_URL) {
  console.error("[DB] WARNING: DATABASE_URL not set - database features will be unavailable");
}

// Create pool only if DATABASE_URL exists
export const pool = process.env.DATABASE_URL 
  ? new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    })
  : null;

// Handle pool errors to prevent crashes
if (pool) {
  pool.on('error', (err) => {
    console.error('Database pool error:', err.message);
  });
}

// Create drizzle instance only if pool exists
export const db = pool ? drizzle(pool, { schema }) : null as any;
