import { consumer, producer } from './kafka'; // <-- Add producer here
import { AccountProjection } from './AccountProjection';
import { redisClient } from './redis';
import { pool } from './db';

export class ProjectionConsumer {
  private projection = new AccountProjection();

  public async start() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'account-events', fromBeginning: true });

    console.log('[Kafka Consumer] Listening for events...');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;

        try {
          // 1. Try to process the message normally
          const event = JSON.parse(message.value.toString());
          await this.projection.handle(event);
          
          const result = await pool.query(
            'SELECT * FROM account_summary WHERE account_id = $1',
            [event.data.accountId]
          );

          if (result.rows.length > 0) {
            await redisClient.setEx(
              `account:${event.data.accountId}`, 
              3600, 
              JSON.stringify(result.rows[0])
            );
          }
          console.log(`[Kafka Consumer] Processed ${event.type}`);

        } catch (error: any) {
          // 2. Catch failures and route to DLQ instead of crashing
          console.error(`[DLQ ALERT] Poison message detected. Routing to DLQ...`);
          
          await producer.send({
            topic: 'dead-letter-events',
            messages: [
              { 
                key: message.key?.toString() || 'unknown', 
                value: message.value.toString() 
              }
            ],
          });
        }
      },
    });
  }
}