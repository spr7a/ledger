import express from 'express';
import { redisClient } from './infrastructure/redis';
import { initializeDatabase } from './infrastructure/db';
import { OutboxWorker } from './infrastructure/OutboxWorker';
import { ProjectionConsumer } from './infrastructure/KafkaConsumer';
import { producer } from './infrastructure/kafka';
import { api } from './api';

const app = express();
const PORT = 3000;

async function bootstrap() {
  await initializeDatabase();
  console.log('Database initialized.');
  await redisClient.connect();
  console.log('Redis connected.');

  // 1. Connect Kafka Producer and Consumer
  await producer.connect();
  const consumerService = new ProjectionConsumer();
  await consumerService.start();

  // 2. Start the Outbox Poller
  const worker = new OutboxWorker();
  setInterval(() => worker.processOutbox(), 2000); 

  // 3. Start API
  app.use('/api', api);
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}

bootstrap();