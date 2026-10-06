// src/infrastructure/AccountProjection.ts
import { pool } from './db';
import { DomainEvent } from '../core/DomainEvent';

export class AccountProjection {
  // This method listens to new events and updates the standard SQL table
  public async handle(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case 'AccountCreated':
        await pool.query(
          `INSERT INTO account_summary (account_id, currency, balance) VALUES ($1, $2, 0)`,
          [event.data.accountId, event.data.currency]
        );
        break;

      case 'MoneyDeposited':
        await pool.query(
          `UPDATE account_summary SET balance = balance + $1, last_updated = NOW() WHERE account_id = $2`,
          [event.data.amount, event.data.accountId]
        );
        break;

      case 'MoneyWithdrawn':
        await pool.query(
          `UPDATE account_summary SET balance = balance - $1, last_updated = NOW() WHERE account_id = $2`,
          [event.data.amount, event.data.accountId]
        );
        break;
    }
    console.log(`[Projection] Updated read model for event: ${event.type}`);
  }
}