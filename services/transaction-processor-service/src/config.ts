import 'dotenv/config';

export type ServiceConfig = {
  databaseUrl: string;
  kafkaBrokers: string[];
  kafkaClientId: string;
  kafkaGroupId: string;
  kafkaTopic: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export const config: ServiceConfig = {
  databaseUrl: requiredEnv('DATABASE_URL'),
  kafkaBrokers: requiredEnv('KAFKA_BROKERS')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean),
  kafkaClientId: process.env.KAFKA_CLIENT_ID?.trim() || 'transaction-processor-service',
  kafkaGroupId: process.env.KAFKA_GROUP_ID?.trim() || 'transaction-processor-group',
  kafkaTopic: process.env.KAFKA_TOPIC?.trim() || 'raw-transactions',
};

if (config.kafkaBrokers.length === 0) {
  throw new Error('KAFKA_BROKERS must contain at least one broker');
}
