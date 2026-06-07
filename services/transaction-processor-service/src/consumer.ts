import { Kafka } from 'kafkajs';
import { config } from './config';
import { pool } from './database/pool';
import { parseTransactionEvent, processTransactionEvent } from './processor';

const kafka = new Kafka({
  clientId: config.kafkaClientId,
  brokers: config.kafkaBrokers,
});

const consumer = kafka.consumer({ groupId: config.kafkaGroupId });
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Received ${signal}, shutting down consumer...`);

  try {
    await consumer.disconnect();
  } catch (error) {
    console.error('Failed to disconnect Kafka consumer cleanly:', error);
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

export async function runConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: config.kafkaTopic, fromBeginning: false });

  console.log(`Connected to Kafka brokers: ${config.kafkaBrokers.join(', ')}`);
  console.log(`Subscribed to topic: ${config.kafkaTopic}`);
  console.log(`Consumer group: ${config.kafkaGroupId}`);

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const rawValue = message.value?.toString('utf8');
      if (!rawValue) {
        console.warn(`Skipping empty message at offset ${message.offset}`);
        return;
      }

      try {
        const event = parseTransactionEvent(rawValue);
        const client = await pool.connect();

        try {
          await client.query('BEGIN');
          await processTransactionEvent(client, event);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        await consumer.commitOffsets([
          {
            topic,
            partition,
            offset: (Number(message.offset) + 1).toString(),
          },
        ]);

        console.log(
          `Committed offset ${(Number(message.offset) + 1).toString()} for partition ${partition}`,
        );
      } catch (error) {
        console.error('Failed to process Kafka message:', error);
      }
    },
  });
}
