import express, { Request, Response } from 'express';
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
  try {
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
  try {
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
    const result = await pool.query(
      'SELECT * FROM account_summary WHERE account_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});