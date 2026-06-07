import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import path from 'path';
import { Pool } from 'pg';
import { config } from './config.js';

type AuthenticatedRequest = Request & { user?: { id: string; email: string; role: string } };

const JWT_SERVICE_URL = process.env.JWT_SERVICE_URL ?? 'http://jwt-api-service:3000';

const pool = new Pool({ connectionString: config.databaseUrl });
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', async (_req: Request, res: Response) => {
  res.redirect('/index.html');
});

app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const response = await fetch(JWT_SERVICE_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) { res.status(response.status).json({ error: data.error ?? 'Login failed' }); return; }
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: 'Unable to reach auth service' });
  }
});

function ensureAuthenticated(request: Request, response: Response, next: NextFunction): void {
  const header = request.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Missing bearer token' });
    return;
  }
  const token = header.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (!decoded.sub || !decoded.email) {
      response.status(401).json({ error: 'Invalid access token' });
      return;
    }
    (request as AuthenticatedRequest).user = { id: decoded.sub, email: decoded.email, role: (decoded as JwtPayload).role as string ?? 'user' };
    next();
  } catch {
    response.status(401).json({ error: 'Invalid access token' });
  }
}

function ensureAdmin(request: AuthenticatedRequest, response: Response, next: NextFunction): void {
  if (!request.user || request.user.role !== 'admin') {
    response.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

type QueryParams = {
  transactionId?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  accountId?: string;
  currency?: string;
  minAmount?: string;
  maxAmount?: string;
  fromDate?: string;
  toDate?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
  accountIdSearch?: string;
  minBalance?: string;
  maxBalance?: string;
};

function parseIntParam(value: string | undefined, def: number, max?: number): number {
  if (value === undefined) return def;
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1) return def;
  if (max !== undefined && n > max) return max;
  return n;
}

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

function sanitizeSortField(field: string, allowed: string[], def: string): string {
  return allowed.includes(field) ? field : def;
}

// ── Health ───────────────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// ── Protect all /api routes ─────────────────────────────────────────
app.use('/api', ensureAuthenticated);

// ── List transactions with filters ────────────────────────────────────
app.get('/api/transactions', async (req: Request, res: Response) => {
  try {
    const q = req.query as QueryParams;
    const page = parseIntParam(q.page, 1);
    const limit = parseIntParam(q.limit, 50, 100);
    const offset = (page - 1) * limit;
    const sortBy = sanitizeSortField(q.sortBy ?? 'processed_at', ['processed_at', 'amount', 'event_timestamp'], 'processed_at');
    const sortOrder = q.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const addParam = (col: string, op: string, val: unknown) => {
      conditions.push(`${col} ${op} $${idx}`);
      params.push(val);
      idx++;
    };

    if (q.transactionId) addParam("raw_event->'payload'->>'transactionId'", '=', q.transactionId);
    if (q.sourceAccountId) addParam("raw_event->'payload'->>'sourceAccountId'", '=', q.sourceAccountId);
    if (q.destinationAccountId) addParam("raw_event->'payload'->>'destinationAccountId'", '=', q.destinationAccountId);
    if (q.accountId) {
      conditions.push(`(raw_event->'payload'->>'sourceAccountId' = $${idx} OR raw_event->'payload'->>'destinationAccountId' = $${idx})`);
      params.push(q.accountId);
      idx++;
    }
    if (q.currency) addParam("raw_event->'payload'->>'currency'", '=', q.currency);
    if (q.minAmount) addParam("(raw_event->'payload'->>'amount')::numeric", '>=', q.minAmount);
    if (q.maxAmount) addParam("(raw_event->'payload'->>'amount')::numeric", '<=', q.maxAmount);
    if (q.fromDate) addParam('processed_at', '>=', q.fromDate);
    if (q.toDate) addParam('processed_at', '<=', q.toDate);

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const sortField = sortBy === 'amount'
      ? "(raw_event->'payload'->>'amount')::numeric"
      : sortBy === 'event_timestamp'
        ? "raw_event->>'timestamp'"
        : 'processed_at';

    const countResult = await pool.query(`SELECT COUNT(*) FROM processed_events ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit);
    params.push(offset);
    const dataResult = await pool.query(
      `SELECT
        event_id,
        transaction_id,
        raw_event->>'eventType' AS event_type,
        raw_event->>'timestamp' AS event_timestamp,
        raw_event->'payload'->>'transactionId' AS transaction_id_inner,
        raw_event->'payload'->>'sourceAccountId' AS source_account_id,
        raw_event->'payload'->>'destinationAccountId' AS destination_account_id,
        (raw_event->'payload'->>'amount')::numeric AS amount,
        raw_event->'payload'->>'currency' AS currency,
        raw_event->'payload'->>'description' AS description,
        raw_event AS raw_event_full,
        processed_at
      FROM processed_events
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${idx} OFFSET $${idx + 1}`,
      params,
    );

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total },
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'Unable to query transactions');
  }
});

// ── Get single transaction by event_id or transaction_id ──────────────
app.get('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT
        event_id,
        transaction_id,
        raw_event->>'eventType' AS event_type,
        raw_event->>'timestamp' AS event_timestamp,
        raw_event->'payload'->>'transactionId' AS transaction_id_inner,
        raw_event->'payload'->>'sourceAccountId' AS source_account_id,
        raw_event->'payload'->>'destinationAccountId' AS destination_account_id,
        (raw_event->'payload'->>'amount')::numeric AS amount,
        raw_event->'payload'->>'currency' AS currency,
        raw_event->'payload'->>'description' AS description,
        raw_event AS raw_event_full,
        processed_at
      FROM processed_events
      WHERE event_id = $1 OR transaction_id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      sendError(res, 404, 'Transaction not found');
      return;
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'Unable to fetch transaction');
  }
});

// ── List accounts ─────────────────────────────────────────────────────
app.get('/api/accounts', async (req: Request, res: Response) => {
  try {
    const q = req.query as QueryParams;
    const page = parseIntParam(q.page, 1);
    const limit = parseIntParam(q.limit, 50, 100);
    const offset = (page - 1) * limit;
    const sortBy = sanitizeSortField(q.sortBy ?? 'account_id', ['account_id', 'balance', 'currency', 'updated_at'], 'account_id');
    const sortOrder = q.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (q.currency) { conditions.push(`currency = $${idx}`); params.push(q.currency); idx++; }
    if (q.accountIdSearch) { conditions.push(`account_id ILIKE $${idx}`); params.push(`%${q.accountIdSearch}%`); idx++; }
    if (q.minBalance) { conditions.push(`balance >= $${idx}`); params.push(q.minBalance); idx++; }
    if (q.maxBalance) { conditions.push(`balance <= $${idx}`); params.push(q.maxBalance); idx++; }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM accounts ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit);
    params.push(offset);
    const dataResult = await pool.query(
      `SELECT account_id, balance, currency, updated_at
       FROM accounts ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params,
    );

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total },
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'Unable to query accounts');
  }
});

// ── Get single account ────────────────────────────────────────────────
app.get('/api/accounts/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const result = await pool.query(
      'SELECT account_id, balance, currency, updated_at FROM accounts WHERE account_id = $1',
      [accountId],
    );

    if (result.rows.length === 0) {
      sendError(res, 404, 'Account not found');
      return;
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'Unable to fetch account');
  }
});

// ── Stats ─────────────────────────────────────────────────────────────
app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const [eventsResult, accountsResult, volumeResult] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM processed_events'),
      pool.query('SELECT COUNT(*) AS total FROM accounts'),
      pool.query(
        `SELECT
          raw_event->'payload'->>'currency' AS currency,
          COUNT(*) AS tx_count,
          SUM((raw_event->'payload'->>'amount')::numeric) AS total_volume
        FROM processed_events
        GROUP BY raw_event->'payload'->>'currency'`,
      ),
    ]);

    res.json({
      total_events: parseInt(eventsResult.rows[0].total, 10),
      total_accounts: parseInt(accountsResult.rows[0].total, 10),
      volume_by_currency: volumeResult.rows,
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'Unable to fetch stats');
  }
});

async function main(): Promise<void> {
  app.listen(config.port, () => {
    console.log(`Transaction API service listening on port ${config.port}`);
  });
}

main().catch((err: unknown) => {
  console.error(err);
  pool.end().catch(() => {});
  process.exit(1);
});
