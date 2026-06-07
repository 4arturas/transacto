import { Umzug, memoryStorage } from 'umzug';
import { pool } from './pool';
import * as migration001 from './migrations/001-create-users';
import * as migration002 from './migrations/002-create-accounts';
import * as migration003 from './migrations/003-create-processed-events';

const logger = {
  info: (message: unknown) => console.log(message),
  warn: (message: unknown) => console.warn(message),
  error: (message: unknown) => console.error(message),
  debug: (message: unknown) => console.debug(message),
};

export const umzug = new Umzug({
  migrations: [migration001, migration002, migration003],
  context: pool,
  storage: memoryStorage(),
  logger,
});

export async function migrateToLatest(): Promise<void> {
  await umzug.up();
}
