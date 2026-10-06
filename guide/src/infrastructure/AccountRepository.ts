import { pool } from './db';
import { AccountAggregate } from '../account/AccountAggregate';
import { DomainEvent } from '../core/DomainEvent';
import { AccountCreated } from '../account/events/AccountCreated';
import { MoneyDeposited } from '../account/events/MoneyDeposited';
import { MoneyWithdrawn } from '../account/events/MoneyWithdrawn';
import { AccountProjection } from './AccountProjection';

export class AccountRepository {
  private projection = new AccountProjection();

  public async save(aggregate: AccountAggregate): Promise<void> {
    const uncommittedEvents = aggregate.getUncommittedEvents();
    if (uncommittedEvents.length === 0) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let currentVersion = aggregate.version;

      for (const event of uncommittedEvents) {
        currentVersion++;
        
        // 1. Save to the Event Log
        await client.query(
          `INSERT INTO events (stream_id, version, event_type, payload, timestamp) 
           VALUES ($1, $2, $3, $4, $5)`,
          [aggregate.id, currentVersion, event.type, event.data, event.timestamp]
        );
        
       await client.query(
          `INSERT INTO outbox_events (event_type, payload, timestamp) 
           VALUES ($1, $2, $3)`,
          [event.type, event.data, event.timestamp]
        );

      }
      const SNAPSHOT_INTERVAL = 5;
      if (
        Math.floor(currentVersion / SNAPSHOT_INTERVAL) > 
        Math.floor(aggregate.version / SNAPSHOT_INTERVAL)
      ) {
        const snapshotData = aggregate.getSnapshotData();
        
        await client.query(
          `INSERT INTO snapshots (stream_id, version, payload, timestamp) 
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (stream_id) DO UPDATE SET 
             version = EXCLUDED.version, 
             payload = EXCLUDED.payload, 
             timestamp = EXCLUDED.timestamp`,
          [aggregate.id, currentVersion, snapshotData]
        );
        console.log(`[Snapshot] Took snapshot at version ${currentVersion}`);
      }

      await client.query('COMMIT');
      aggregate.markChangesAsCommitted();
      aggregate.version = currentVersion; 
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async load(accountId: string): Promise<AccountAggregate> {
    const aggregate = new AccountAggregate(accountId);
    let startVersion = 0;

    // 1. Try to load the latest snapshot
    const snapshotResult = await pool.query(
      `SELECT * FROM snapshots WHERE stream_id = $1`,
      [accountId]
    );

    if (snapshotResult.rows.length > 0) {
      const snapshot = snapshotResult.rows[0];
      aggregate.restoreFromSnapshot(snapshot.version, snapshot.payload);
      startVersion = snapshot.version;
      console.log(`[Repository] Loaded snapshot at version ${startVersion}`); // We only need events AFTER this version
    }

    // 2. Load only the events that occurred after the snapshot
    const eventsResult = await pool.query(
      `SELECT * FROM events WHERE stream_id = $1 AND version > $2 ORDER BY version ASC`,
      [accountId, startVersion]
    );

    // 3. Replay the tail events
    if (eventsResult.rows.length > 0) {
      const history: DomainEvent[] = eventsResult.rows.map((row) => {
        switch (row.event_type) {
          case 'AccountCreated': return new AccountCreated(row.payload);
          case 'MoneyDeposited': return new MoneyDeposited(row.payload);
          case 'MoneyWithdrawn': return new MoneyWithdrawn(row.payload);
          default: throw new Error(`Unknown event type: ${row.event_type}`);
        }
      });
      aggregate.loadFromHistory(history);
    }

    return aggregate;
  }
}