import { Pool } from 'pg';

export const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'password', // Change to your local postgres password
  port: 5432,
});

export async function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS events (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      stream_id VARCHAR(255) NOT NULL,
      version INT NOT NULL,
      event_type VARCHAR(255) NOT NULL,
      payload JSONB NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW(),
      UNIQUE(stream_id, version)
    );
  `;
  await pool.query(createTableQuery);
}