import type { Pool } from 'pg';

export const name = '001-create-users';

export async function up({ context }: { context: Pool }): Promise<void> {
  await context.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function down({ context }: { context: Pool }): Promise<void> {
  await context.query('DROP TABLE IF EXISTS users');
}
