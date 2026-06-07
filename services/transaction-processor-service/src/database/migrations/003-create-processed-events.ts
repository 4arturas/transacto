import type { Pool } from 'pg';

export const name = '003-create-processed-events';

export async function up({ context }: { context: Pool }): Promise<void> {
  await context.query(`
    CREATE TABLE IF NOT EXISTS processed_events (
      event_id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      raw_event JSONB NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function down({ context }: { context: Pool }): Promise<void> {
  await context.query('DROP TABLE IF EXISTS processed_events');
}
