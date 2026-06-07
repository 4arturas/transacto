import 'dotenv/config';
import { pool } from './database/pool';
import { migrateToLatest } from './database/umzug';
import { runConsumer } from './consumer';

async function main(): Promise<void> {
  await migrateToLatest();

  if (process.argv.includes('--migrate-only')) {
    await pool.end();
    return;
  }

  await runConsumer();
}

main().catch(async (error: unknown) => {
  console.error(error);
  try {
    await pool.end();
  } catch (disconnectError) {
    console.error('Failed to close database pool:', disconnectError);
  }
  process.exit(1);
});
