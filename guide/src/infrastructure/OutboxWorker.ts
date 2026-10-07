import { pool } from './db';
import { producer } from './kafka';
import { AccountProjection } from './AccountProjection';

export class OutboxWorker {
  private projection = new AccountProjection();
  private isRunning = false;

  public start() {
    console.log('[OutboxWorker] Starting background polling...');
    // Poll the database every 2 seconds
    setInterval(() => this.processOutbox(), 2000); 
  }

  public async processOutbox() {
    if (this.isRunning) return; // Prevent overlapping runs
    this.isRunning = true;

    try {
      // 1. Fetch the oldest 10 unprocessed events
      const result = await pool.query(
        `SELECT * FROM outbox_events ORDER BY timestamp ASC LIMIT 10`
      );

      for (const row of result.rows) {
        // 2. Format the row back into a DomainEvent shape
        const event = {
          type: row.event_type,
          data: row.payload,
          timestamp: row.timestamp
        };

        // 1. Publish to Kafka
        await producer.send({
          topic: 'account-events',
          messages: [
            { 
              key: event.data.accountId, // Ensures events for the same account stay in order
              value: JSON.stringify(event) 
            },
          ],
        });

        // 4. Delete the event from the outbox so we don't process it again
        await pool.query(`DELETE FROM outbox_events WHERE id = $1`, [row.id]);
        
        console.log(`[OutboxWorker] Processed & deleted outbox event: ${row.id}`);
      }
    } catch (error) {
      console.error('[OutboxWorker] Error processing outbox:', error);
    } finally {
      this.isRunning = false;
    }
  }
}