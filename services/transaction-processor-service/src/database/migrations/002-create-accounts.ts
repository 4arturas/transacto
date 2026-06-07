import type { Pool } from 'pg';

export const name = '002-create-accounts';

export async function up({ context }: { context: Pool }): Promise<void> {
  await context.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      account_id TEXT PRIMARY KEY,
      balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
      currency VARCHAR(3) NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function down({ context }: { context: Pool }): Promise<void> {
  await context.query('DROP TABLE IF EXISTS accounts');
}
