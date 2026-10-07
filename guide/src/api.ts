import express, { Request, Response } from 'express';
import { redisClient } from './infrastructure/redis';
import { AccountRepository } from './infrastructure/AccountRepository';
import { pool } from './infrastructure/db';
import { AccountAggregate } from './account/AccountAggregate';

export const api = express.Router();
const repository = new AccountRepository();

api.use(express.json());

// COMMAND: Create a new account
api.post('/accounts', async (req: Request, res: Response) => {
  try {
    const { accountId, currency } = req.body;
    const account = new AccountAggregate(accountId);
    account.create(currency);
    await repository.save(account);
    res.status(201).json({ message: 'Account created' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// COMMAND: Deposit money
api.post('/accounts/:id/deposit', async (req: Request, res: Response) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  try {
    // 1. Try to lock the idempotency key first
    try {
      await pool.query('INSERT INTO idempotency_keys (key) VALUES ($1)', [idempotencyKey]);
    } catch (dbError: any) {
      if (dbError.code === '23505') { // Postgres Unique Violation
        console.log(`[API] Ignored duplicate request for key: ${idempotencyKey}`);
        return res.status(200).json({ message: 'Deposit already processed (Idempotent)' });
      }
      throw dbError; 
    }

    // 2. Process the actual deposit if the key is new
    const account = await repository.load(req.params.id);
    account.deposit(req.body.amount);
    await repository.save(account);
    
    res.status(200).json({ message: 'Deposit successful' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// COMMAND: Withdraw money
api.post('/accounts/:id/withdraw', async (req: Request, res: Response) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  try {
    try {
      await pool.query('INSERT INTO idempotency_keys (key) VALUES ($1)', [idempotencyKey]);
    } catch (dbError: any) {
      if (dbError.code === '23505') {
        console.log(`[API] Ignored duplicate request for key: ${idempotencyKey}`);
        return res.status(200).json({ message: 'Withdrawal already processed (Idempotent)' });
      }
      throw dbError;
    }

    const account = await repository.load(req.params.id);
    account.withdraw(req.body.amount);
    await repository.save(account);
    
    res.status(200).json({ message: 'Withdrawal successful' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// QUERY: Get account balance (Reads from the fast CQRS projection table)
api.get('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const accountId = req.params.id;
    const cacheKey = `account:${accountId}`;

    // 1. Check Redis First (Ultra-fast memory read)
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`[API] Cache HIT for ${accountId}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2. Cache MISS: Fallback to PostgreSQL
    console.log(`[API] Cache MISS for ${accountId}. Querying DB...`);
    const result = await pool.query(
      'SELECT * FROM account_summary WHERE account_id = $1',
      [accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // 3. Save to Redis for next time, then return
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result.rows[0]));
    res.status(200).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
