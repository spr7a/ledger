import { Kafka } from 'kafkajs';

export const kafka = new Kafka({
  clientId: 'ledger-app',
  brokers: ['localhost:9092'], // Connects to the Docker container
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: 'projection-group' });