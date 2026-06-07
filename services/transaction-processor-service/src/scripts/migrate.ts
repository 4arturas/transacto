import 'dotenv/config';
import { migrateToLatest } from '../database/umzug';
import { pool } from '../database/pool';

async function main(): Promise<void> {
  await migrateToLatest();
  await pool.end();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
