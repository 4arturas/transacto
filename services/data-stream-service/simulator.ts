import 'dotenv/config';
import { Kafka } from 'kafkajs';
import crypto from 'crypto';

const topic = process.env.KAFKA_TOPIC ?? 'raw-transactions';
const clientId = process.env.KAFKA_CLIENT_ID ?? 'data-stream-simulator';
const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

if (brokers.length === 0) {
  throw new Error('KAFKA_BROKERS must contain at least one broker');
}

type TransactionEvent = {
  eventId: string;
  eventType: 'TRANSACTION_POSTED';
  timestamp: string;
  payload: {
    transactionId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    currency: 'EUR' | 'DKK' | 'USD';
    description: string;
  };
};

const currencyOptions: Array<'EUR' | 'DKK' | 'USD'> = ['EUR', 'DKK', 'USD'];
const descriptionOptions = [
  'Salary payment',
  'Grocery Store',
  'Utility Bill',
  'Coffee Shop',
  'Restaurant',
  'Subscription Renewal',
  'Online Purchase',
  'Invoice Payment',
  'Taxi Ride',
  'Rent Payment',
];
const sourcePrefixes = ['ACC-DK', 'ACC-LT', 'ACC-EE', 'ACC-SE'];
const destinationPrefixes = ['ACC-LT', 'ACC-DK', 'ACC-EE', 'ACC-FI'];

function randomItem<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

function randomAccountId(prefixes: string[]): string {
  return `${randomItem(prefixes)}-${randomDigits(8)}`;
}

function randomAmount(): number {
  const amount = 5 + Math.random() * (5000 - 5);
  return Number(amount.toFixed(2));
}

function randomSleepMs(): number {
  return 10 * 60 * 1000;
}

function buildTransactionEvent(): TransactionEvent {
  const sourceAccountId = randomAccountId(sourcePrefixes);
  let destinationAccountId = randomAccountId(destinationPrefixes);

  if (destinationAccountId === sourceAccountId) {
    destinationAccountId = randomAccountId(destinationPrefixes);
  }

  return {
    eventId: `evt_${crypto.randomUUID()}`,
    eventType: 'TRANSACTION_POSTED',
    timestamp: new Date().toISOString(),
    payload: {
      transactionId: `tx_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`,
      sourceAccountId,
      destinationAccountId,
      amount: randomAmount(),
      currency: randomItem(currencyOptions),
      description: randomItem(descriptionOptions),
    },
  };
}

const kafka = new Kafka({
  clientId,
  brokers,
});

const producer = kafka.producer();
let shuttingDown = false;
let loopPromise: Promise<void> | null = null;
let currentDelayMs = randomSleepMs();

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendSingleTransaction(): Promise<void> {
  const event = buildTransactionEvent();
  const payloadText = JSON.stringify(event, null, 2);

  const result = await producer.send({
    topic,
    messages: [
      {
        key: event.payload.sourceAccountId,
        value: JSON.stringify(event),
      },
    ],
  });

  const metadata = result[0];

  console.log('--------------------------------------------------');
  console.log(`Next delay chosen: ${currentDelayMs} ms`);
  console.log('Kafka topic:', topic);
  console.log('Message key:', event.payload.sourceAccountId);
  console.log('Payload:\n', payloadText);
  console.log('Kafka metadata:', {
    partition: metadata?.partition,
    offset: metadata?.offset,
  });
}

async function runLoop(): Promise<void> {
  await producer.connect();
  console.log(`Connected to Kafka brokers: ${brokers.join(', ')}`);
  console.log(`Producing events to topic: ${topic}`);

  await sendSingleTransaction();

  while (!shuttingDown) {
    currentDelayMs = randomSleepMs();
    console.log(`Waiting ${currentDelayMs} ms before next transaction...`);
    await sleep(currentDelayMs);

    if (shuttingDown) {
      break;
    }

    try {
      await sendSingleTransaction();
    } catch (error) {
      console.error('Failed to publish transaction event:', error);
    }
  }
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Received ${signal}, shutting down...`);

  try {
    await producer.disconnect();
  } catch (error) {
    console.error('Failed to disconnect Kafka producer cleanly:', error);
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

loopPromise = runLoop();

loopPromise.catch(async (error) => {
  console.error('Fatal simulator error:', error);
  try {
    await producer.disconnect();
  } catch (disconnectError) {
    console.error('Failed to disconnect after fatal error:', disconnectError);
  }
  process.exit(1);
});
