import { consumer } from './kafka';
import { AccountProjection } from './AccountProjection';

export class ProjectionConsumer {
  private projection = new AccountProjection();

  public async start() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'account-events', fromBeginning: true });

    console.log('[Kafka Consumer] Listening for events...');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;

        const event = JSON.parse(message.value.toString());
        
        // Update the Read Model based on the Kafka message
        await this.projection.handle(event);
        
        console.log(`[Kafka Consumer] Processed ${event.type} from Kafka`);
      },
    });
  }
}