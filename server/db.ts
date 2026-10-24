import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { config } from "dotenv";

config();

const { Pool } = pg;

// ============================================================
// LOCAL POSTGRESQL DATABASE
// ============================================================

export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "SFK",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on("error", (error) => {
  console.error("❌ Local PostgreSQL pool error:", error.message);
});

// ============================================================
// LIVE POSTGRESQL DATABASE
// ============================================================
// Use this pool for server-side operations that explicitly need the live DB.
// The Drizzle instance below continues to use the local pool.

export const livePool = new Pool({
  host: process.env.LIVE_PGHOST || "84.16.235.111",
  port: Number(process.env.LIVE_PGPORT || 5432),
  database: process.env.LIVE_PGDATABASE || "SFK_WB",
  user: process.env.LIVE_PGUSER || "postgres",
  password: process.env.LIVE_PGPASSWORD || "",
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  statement_timeout: 120000,
  query_timeout: 130000,
  max: 10,
});

livePool.on("error", (error) => {
  console.error("❌ Live PostgreSQL pool error:", error.message);
});

// ============================================================
// DRIZZLE DATABASE
// ============================================================

export const db = drizzle({
  client: pool,
  schema,
});
