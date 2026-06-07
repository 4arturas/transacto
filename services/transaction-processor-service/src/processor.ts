import type { PoolClient } from 'pg';
import type { AccountRow, TransactionEvent } from './types';

function toDecimal(amount: number): string {
  return amount.toFixed(2);
}

function assertTransactionEvent(value: unknown): asserts value is TransactionEvent {
  if (!value || typeof value !== 'object') {
    throw new Error('Event payload must be an object');
  }

  const event = value as Partial<TransactionEvent>;
  if (event.eventType !== 'TRANSACTION_POSTED') {
    throw new Error('Unsupported event type');
  }

  if (typeof event.eventId !== 'string' || typeof event.timestamp !== 'string' || !event.payload) {
    throw new Error('Invalid transaction event envelope');
  }

  const payload = event.payload as Partial<TransactionEvent['payload']>;
  if (
    typeof payload.transactionId !== 'string' ||
    typeof payload.sourceAccountId !== 'string' ||
    typeof payload.destinationAccountId !== 'string' ||
    typeof payload.amount !== 'number' ||
    typeof payload.currency !== 'string' ||
    typeof payload.description !== 'string'
  ) {
    throw new Error('Invalid transaction payload');
  }
}

export function parseTransactionEvent(rawMessage: string): TransactionEvent {
  const parsed = JSON.parse(rawMessage) as unknown;
  assertTransactionEvent(parsed);
  return parsed;
}

async function ensureAccount(client: PoolClient, accountId: string, currency: TransactionEvent['payload']['currency']): Promise<AccountRow> {
  await client.query(
    `INSERT INTO accounts (account_id, balance, currency, updated_at)
     VALUES ($1, 0, $2, NOW())
     ON CONFLICT (account_id) DO NOTHING`,
    [accountId, currency],
  );

  const result = await client.query<AccountRow>(
    'SELECT account_id, balance, currency, updated_at FROM accounts WHERE account_id = $1 FOR UPDATE',
    [accountId],
  );

  const account = result.rows[0];
  if (!account) {
    throw new Error(`Unable to load account ${accountId}`);
  }

  if (account.currency !== currency) {
    throw new Error(`Currency mismatch for account ${accountId}: expected ${account.currency}, received ${currency}`);
  }

  return account;
}

async function updateAccountBalance(
  client: PoolClient,
  accountId: string,
  delta: number,
): Promise<AccountRow> {
  const result = await client.query<AccountRow>(
    `UPDATE accounts
     SET balance = balance + $2::numeric, updated_at = NOW()
     WHERE account_id = $1
     RETURNING account_id, balance, currency, updated_at`,
    [accountId, toDecimal(delta)],
  );

  const account = result.rows[0];
  if (!account) {
    throw new Error(`Unable to update account ${accountId}`);
  }

  return account;
}

export async function processTransactionEvent(client: PoolClient, event: TransactionEvent): Promise<boolean> {
  const idempotencyResult = await client.query(
    `INSERT INTO processed_events (event_id, transaction_id, raw_event)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [event.eventId, event.payload.transactionId, JSON.stringify(event)],
  );

  if (idempotencyResult.rowCount === 0) {
    console.log(`Skipping already processed event ${event.eventId}`);
    return false;
  }

  const sourceAccount = await ensureAccount(client, event.payload.sourceAccountId, event.payload.currency);
  const destinationAccount = await ensureAccount(client, event.payload.destinationAccountId, event.payload.currency);

  const amount = event.payload.amount;
  const updatedSource = await updateAccountBalance(client, sourceAccount.account_id, -amount);
  const updatedDestination = await updateAccountBalance(client, destinationAccount.account_id, amount);

  console.log({
    eventId: event.eventId,
    transactionId: event.payload.transactionId,
    sourceAccountId: updatedSource.account_id,
    sourceBalance: updatedSource.balance,
    destinationAccountId: updatedDestination.account_id,
    destinationBalance: updatedDestination.balance,
    currency: event.payload.currency,
    description: event.payload.description,
  });

  return true;
}
