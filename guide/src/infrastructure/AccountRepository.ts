import { pool } from './db';
import { AccountAggregate } from '../account/AccountAggregate';
import { DomainEvent } from '../core/DomainEvent';
import { AccountCreated } from '../account/events/AccountCreated';
import { MoneyDeposited } from '../account/events/MoneyDeposited';
import { MoneyWithdrawn } from '../account/events/MoneyWithdrawn';

export class AccountRepository {
  public async save(aggregate: AccountAggregate): Promise<void> {
    const uncommittedEvents = aggregate.getUncommittedEvents();
    if (uncommittedEvents.length === 0) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN'); // Start SQL Transaction

      let currentVersion = aggregate.version;

      for (const event of uncommittedEvents) {
        currentVersion++; // Increment version for each new event

        await client.query(
          `INSERT INTO events (stream_id, version, event_type, payload, timestamp) 
           VALUES ($1, $2, $3, $4, $5)`,
          [aggregate.id, currentVersion, event.type, event.data, event.timestamp]
        );
      }

      await client.query('COMMIT');
      aggregate.markChangesAsCommitted();
      
      // Update the aggregate's internal version tracker after saving
      aggregate.version = currentVersion; 
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async load(accountId: string): Promise<AccountAggregate> {
    const result = await pool.query(
      `SELECT * FROM events WHERE stream_id = $1 ORDER BY version ASC`,
      [accountId]
    );

    const aggregate = new AccountAggregate(accountId);
    
    if (result.rows.length === 0) {
      return aggregate; // Return an empty aggregate if no history exists
    }

    const history: DomainEvent[] = result.rows.map((row) => {
      // Reconstruct the correct TypeScript class based on the database column
      switch (row.event_type) {
        case 'AccountCreated':
          return new AccountCreated(row.payload);
        case 'MoneyDeposited':
          return new MoneyDeposited(row.payload);
        case 'MoneyWithdrawn':
          return new MoneyWithdrawn(row.payload);
        default:
          throw new Error(`Unknown event type: ${row.event_type}`);
      }
    });

    aggregate.loadFromHistory(history);
    return aggregate;
  }
}