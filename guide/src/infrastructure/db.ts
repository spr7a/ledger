// src/infrastructure/db.ts
import { Pool } from 'pg';

export const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'password',
  port: 5432,
});

export async function initializeDatabase() {
  // The Write Model (Event Store)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      stream_id VARCHAR(255) NOT NULL,
      version INT NOT NULL,
      event_type VARCHAR(255) NOT NULL,
      payload JSONB NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW(),
      UNIQUE(stream_id, version)
    );
  `);

  // The Read Model (For fast API queries)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS account_summary (
      account_id VARCHAR(255) PRIMARY KEY,
      balance INT NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL,
      last_updated TIMESTAMP DEFAULT NOW()
    );
  `);
  // NEW: The Outbox Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outbox_events (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      event_type VARCHAR(255) NOT NULL,
      payload JSONB NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS snapshots (
      stream_id VARCHAR(255) PRIMARY KEY,
      version INT NOT NULL,
      payload JSONB NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key VARCHAR(255) PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}