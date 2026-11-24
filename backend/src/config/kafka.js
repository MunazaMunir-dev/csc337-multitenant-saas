
import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config();

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092')
  .split(',')
  .map(x => x.trim())
  .filter(Boolean);

export const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'csc337-saas',
  brokers,
  ssl: process.env.KAFKA_SSL === 'true'
    ? {
        ca: [fs.readFileSync(process.env.KAFKA_CA_PATH, 'utf-8')]
      }
    : false,
  sasl: process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD
    ? {
        mechanism: 'plain',
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD
      }
    : undefined
});

export const topic = process.env.KAFKA_TOPIC || 'tenant.orders';
