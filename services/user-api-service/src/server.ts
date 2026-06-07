import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import path from 'path';
import { Pool, type QueryResultRow } from 'pg';

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
  updated_at: Date;
};

type AuthenticatedRequest = Request & {
  user?: { id: string; email: string; role: string };
};

const PORT = Number(process.env.PORT ?? 3100);
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';

if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

const JWT_SERVICE_URL = process.env.JWT_SERVICE_URL ?? 'http://jwt-api-service:3000';

const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', async (_request: Request, response: Response) => {
  response.redirect('/admin.html');
});

function sendError(response: Response, status: number, message: string): void {
  response.status(status).json({ error: message });
}

async function queryOne<T extends QueryResultRow>(sql: string, params: unknown[]): Promise<T | null> {
  const result = await pool.query<T>(sql, params);
  return result.rows[0] ?? null;
}

async function findUserById(userId: string): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE id = $1', [userId]);
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1', [email]);
}

function ensureAuthenticated(request: Request, response: Response, next: NextFunction): void {
  const header = request.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Missing bearer token' });
    return;
  }
  const token = header.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as JwtPayload;
    if (!decoded.sub || !decoded.email) {
      response.status(401).json({ error: 'Invalid access token' });
      return;
    }
    (request as AuthenticatedRequest).user = { id: decoded.sub, email: decoded.email, role: decoded.role as string ?? 'user' };
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

async function ensureSchema(): Promise<void> {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)
  `);
}

async function seedAdmin(): Promise<void> {
  const existing = await findUserByEmail(ADMIN_EMAIL);
  if (existing) {
    if (existing.role !== 'admin') {
      await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE email = $2', ['admin', ADMIN_EMAIL]);
      console.log(`Upgraded ${ADMIN_EMAIL} to admin`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)`,
    [crypto.randomUUID(), ADMIN_EMAIL, passwordHash, 'admin'],
  );
  console.log(`Created admin user: ${ADMIN_EMAIL}`);
}

async function listUsers(page: number, limit: number): Promise<{ users: Pick<UserRow, 'id' | 'email' | 'role' | 'created_at'>[]; total: number }> {
  const offset = (page - 1) * limit;
  const countResult = await pool.query('SELECT COUNT(*) FROM users');
  const total = parseInt(countResult.rows[0].count, 10);
  const result = await pool.query(
    'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset],
  );
  return { users: result.rows, total };
}

app.post('/api/login', async (request: Request, response: Response) => {
  try {
    const { email, password } = request.body as { email?: string; password?: string };
    const res = await fetch(JWT_SERVICE_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { sendError(response, res.status, data.error ?? 'Login failed'); return; }
    response.status(200).json(data);
  } catch {
    sendError(response, 502, 'Unable to reach auth service');
  }
});

app.get('/health', async (_request: Request, response: Response) => {
  response.status(200).json({ status: 'ok' });
});

app.get('/api/me', ensureAuthenticated, async (request: AuthenticatedRequest, response: Response) => {
  try {
    if (!request.user) { sendError(response, 401, 'Unauthorized'); return; }
    const user = await findUserById(request.user.id);
    if (!user) { sendError(response, 404, 'User not found'); return; }
    response.status(200).json({ user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at } });
  } catch {
    sendError(response, 500, 'Unable to load user profile');
  }
});

app.get('/api/users', ensureAuthenticated, ensureAdmin, async (request: AuthenticatedRequest, response: Response) => {
  try {
    const page = Math.max(1, parseInt(String(request.query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(request.query.limit ?? '50'), 10)));
    const { users, total } = await listUsers(page, limit);
    response.status(200).json({ data: users, pagination: { page, limit, total } });
  } catch {
    sendError(response, 500, 'Unable to list users');
  }
});

app.post('/api/users', ensureAuthenticated, ensureAdmin, async (request: AuthenticatedRequest, response: Response) => {
  try {
    const { email, password, role } = request.body as { email?: string; password?: string; role?: string };
    if (!email || !password) { sendError(response, 400, 'email and password are required'); return; }
    if (password.length < 6) { sendError(response, 400, 'Password must be at least 6 characters'); return; }
    if (role && !['user', 'admin'].includes(role)) { sendError(response, 400, 'Role must be "user" or "admin"'); return; }
    const existing = await findUserByEmail(email.toLowerCase());
    if (existing) { sendError(response, 409, 'Email already registered'); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    const newRole = role ?? 'user';
    const created = await queryOne<Pick<UserRow, 'id' | 'email' | 'role' | 'created_at'>>(
      `INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, created_at`,
      [userId, email.toLowerCase(), passwordHash, newRole],
    );
    if (!created) { sendError(response, 500, 'Unable to create user'); return; }
    response.status(201).json({ user: created });
  } catch {
    sendError(response, 500, 'Unable to create user');
  }
});

app.get('/api/users/:id', ensureAuthenticated, ensureAdmin, async (request: AuthenticatedRequest, response: Response) => {
  try {
    const user = await findUserById(String(request.params.id));
    if (!user) { sendError(response, 404, 'User not found'); return; }
    response.status(200).json({ user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at, updated_at: user.updated_at } });
  } catch {
    sendError(response, 500, 'Unable to fetch user');
  }
});

app.put('/api/users/:id/role', ensureAuthenticated, ensureAdmin, async (request: AuthenticatedRequest, response: Response) => {
  try {
    const { role } = request.body as { role?: string };
    if (!role || !['user', 'admin'].includes(role)) {
      sendError(response, 400, 'Role must be "user" or "admin"');
      return;
    }
    const user = await findUserById(String(request.params.id));
    if (!user) { sendError(response, 404, 'User not found'); return; }
    if (user.email === ADMIN_EMAIL) { sendError(response, 400, 'Cannot change role of the primary admin'); return; }
    await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, String(request.params.id)]);
    response.status(200).json({ user: { id: user.id, email: user.email, role, updated_at: new Date() } });
  } catch {
    sendError(response, 500, 'Unable to update user role');
  }
});

app.delete('/api/users/:id', ensureAuthenticated, ensureAdmin, async (request: AuthenticatedRequest, response: Response) => {
  try {
    const user = await findUserById(String(request.params.id));
    if (!user) { sendError(response, 404, 'User not found'); return; }
    if (user.email === ADMIN_EMAIL) { sendError(response, 400, 'Cannot delete the primary admin'); return; }
    await pool.query('DELETE FROM users WHERE id = $1', [request.params.id]);
    response.status(200).json({ message: 'User deleted' });
  } catch {
    sendError(response, 500, 'Unable to delete user');
  }
});

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  response.status(500).json({ error: error.message });
});

async function main(): Promise<void> {
  await ensureSchema();
  await seedAdmin();

  app.listen(PORT, () => {
    console.log(`User service listening on port ${PORT}`);
  });
}

main().catch(async (error: unknown) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
