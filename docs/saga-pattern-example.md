# Saga Pattern Example: Cross-Border Transfer

## The Problem

A transfer between two accounts involves multiple steps across different services. With distributed services and separate databases, there's no global ACID transaction. If step 3 fails, steps 1–2 have already committed.

```
1. Validate transaction  (transaction-processor DB)
2. Debit source account  (transaction-processor DB)
3. Credit dest. account  (transaction-processor DB) ← FAILS
4. Publish event        (Kafka)
```

Without a Saga, account A is debited but account B never receives the money.

---

## The Solution: Orchestration Saga

A central coordinator (the Saga orchestrator) tracks each step and calls compensating actions on failure.

```
Success path:
  validate → debit → credit → publish → ✅

Failure path (credit fails):
  validate → debit → credit → FAIL
    ↓ (compensate)
  reverseDebit → publishFailure → ❌
```

---

## Code Example

### Saga Step Definition

```typescript
interface SagaStep<T = any> {
  name: string;
  execute(input: T): Promise<void>;
  compensate(input: T): Promise<void>;  // ← the rollback action
}

interface SagaContext {
  transferId: string;
  sourceAccount: string;
  destinationAccount: string;
  amount: number;
  currency: string;
}
```

### Individual Steps

```typescript
// ── Step 1: Freeze source funds ──────────────────────────────
const freezeSource: SagaStep = {
  name: 'freeze-source',
  async execute(ctx) {
    await db.query(
      `UPDATE accounts SET hold_balance = hold_balance + $1
       WHERE account_id = $2 AND available_balance >= $1`,
      [ctx.amount, ctx.sourceAccount]
    );
  },
  async compensate(ctx) {
    await db.query(
      `UPDATE accounts SET hold_balance = hold_balance - $1
       WHERE account_id = $2`,
      [ctx.amount, ctx.sourceAccount]
    );
  },
};

// ── Step 2: Debit source (final) ──────────────────────────────
const debitSource: SagaStep = {
  name: 'debit-source',
  async execute(ctx) {
    await db.query(
      `UPDATE accounts
       SET balance = balance - $1,
           hold_balance = hold_balance - $1
       WHERE account_id = $2`,
      [ctx.amount, ctx.sourceAccount]
    );
  },
  async compensate(ctx) {
    await db.query(
      `UPDATE accounts
       SET balance = balance + $1
       WHERE account_id = $2`,
      [ctx.amount, ctx.sourceAccount]
    );
  },
};

// ── Step 3: Credit destination ────────────────────────────────
const creditDestination: SagaStep = {
  name: 'credit-destination',
  async execute(ctx) {
    await db.query(
      `UPDATE accounts SET balance = balance + $1
       WHERE account_id = $2`,
      [ctx.amount, ctx.destinationAccount]
    );
  },
  async compensate(ctx) {
    await db.query(
      `UPDATE accounts SET balance = balance - $1
       WHERE account_id = $2`,
      [ctx.amount, ctx.destinationAccount]
    );
  },
};

// ── Step 4: Record transfer ───────────────────────────────────
const recordTransfer: SagaStep = {
  name: 'record-transfer',
  async execute(ctx) {
    await db.query(
      `INSERT INTO transfers (id, source, dest, amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, 'completed')`,
      [ctx.transferId, ctx.sourceAccount, ctx.destinationAccount,
       ctx.amount, ctx.currency]
    );
  },
  async compensate(ctx) {
    await db.query(
      `UPDATE transfers SET status = 'failed' WHERE id = $1`,
      [ctx.transferId]
    );
  },
};
```

### Orchestrator

```typescript
async function runSaga(steps: SagaStep[], context: SagaContext) {
  const executed: SagaStep[] = [];

  for (const step of steps) {
    try {
      console.log(`  → ${step.name}`);
      await step.execute(context);
      executed.push(step);
    } catch (err) {
      console.log(`  ✗ ${step.name} failed: ${err.message}`);
      console.log(`  ↻ Rolling back ${executed.length} steps...`);

      // Compensate in reverse order
      for (const done of executed.reverse()) {
        try {
          console.log(`    ↺ ${done.name}`);
          await done.compensate(context);
        } catch (compErr) {
          console.error(`    ✗ Compensation failed for ${done.name}: ${compErr.message}`);
          // Log for manual intervention
        }
      }

      throw new Error(`Saga failed at step "${step.name}"`);
    }
  }

  console.log('  ✅ Saga completed');
}
```

### Usage

```typescript
await runSaga(
  [freezeSource, debitSource, creditDestination, recordTransfer],
  {
    transferId: uuid(),
    sourceAccount: 'ACC-DK-12345678',
    destinationAccount: 'ACC-FI-87654321',
    amount: 1500.00,
    currency: 'EUR',
  }
);
```

---

## How This Maps to Your Project

The `transaction-processor-service` processes raw Kafka events and updates balances. If you add a Saga orchestrator:

1. **Kafka event arrives** → Saga starts
2. **freezeSource** → adds to `hold_balance`
3. **debitSource** → subtracts from `balance`, removes hold
4. **creditDestination** → adds to destination `balance`
5. **recordTransfer** → writes to `transfers` table with status `completed`

If any step throws, all previous steps are compensated automatically.

---

## Orchestration vs. Choreography

| Approach | How it works | Pros | Cons |
|----------|-------------|------|------|
| **Orchestration** (shown above) | Central coordinator calls each service | Easy to understand, test, and debug | Coordinator is a single point of failure |
| **Choreography** | Each service listens for events and does its part | No central service, naturally decoupled | Logic is spread across services, harder to trace failures |

For a banking system, **orchestration** is usually preferred because audit trails and deterministic rollback are critical.

---

## Bonus: Idempotency Keys

In a distributed system, the same event might be delivered twice. Every step should be idempotent:

```typescript
async function debitSource(ctx) {
  // WHERE NOT processed_events.idempotency_key = $3
  await db.query(`
    UPDATE accounts SET balance = balance - $1
    WHERE account_id = $2
  `, [ctx.amount, ctx.sourceAccount]);
}
```
