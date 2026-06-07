import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Pool, type QueryResultRow } from 'pg';

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
  updated_at: Date;
};

type RefreshTokenRow = {
  id: string;
  user_id: string;
  token_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
};

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
    role: string;
  };
};

type AccessTokenPayload = JwtPayload & {
  sub: string;
  email: string;
  role: string;
};

type RefreshTokenPayload = JwtPayload & {
  sub: string;
  tokenId: string;
};

const PORT = Number(process.env.PORT ?? 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

if (!REFRESH_SECRET) {
  throw new Error('REFRESH_SECRET is required');
}

const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();
app.use(express.json());
app.use(cookieParser());

function sendError(response: Response, status: number, message: string): void {
  response.status(status).json({ error: message });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseTokenExpiry(value: string): string {
  return value;
}

async function queryOne<T extends QueryResultRow>(sql: string, params: unknown[]): Promise<T | null> {
  const result = await pool.query<T>(sql, params);
  return result.rows[0] ?? null;
}

async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_id UUID NOT NULL UNIQUE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  } as const;
}

async function createAccessToken(user: { id: string; email: string; role: string }): Promise<string> {
  const signOptions: jwt.SignOptions = {
    subject: user.id,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };

  return jwt.sign({ email: user.email, role: user.role }, JWT_SECRET as string, signOptions);
}

async function createRefreshToken(userId: string): Promise<{ token: string; tokenId: string; expiresAt: Date }> {
  const tokenId = crypto.randomUUID();
  const signOptions: jwt.SignOptions = {
    subject: userId,
    expiresIn: parseTokenExpiry(REFRESH_TOKEN_EXPIRES_IN) as jwt.SignOptions['expiresIn'],
  };

  const token = jwt.sign({ tokenId }, REFRESH_SECRET as string, signOptions);

  const decoded = jwt.decode(token) as RefreshTokenPayload | null;
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return { token, tokenId, expiresAt };
}

async function storeRefreshToken(userId: string, token: string, tokenId: string, expiresAt: Date): Promise<void> {
  await pool.query(
    `INSERT INTO refresh_tokens (id, user_id, token_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (token_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at`,
    [crypto.randomUUID(), userId, tokenId, hashRefreshToken(token), expiresAt],
  );
}

async function deleteRefreshTokenById(tokenId: string): Promise<void> {
  await pool.query('DELETE FROM refresh_tokens WHERE token_id = $1', [tokenId]);
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1', [email]);
}

async function findUserById(userId: string): Promise<Pick<UserRow, 'id' | 'email' | 'role' | 'created_at' | 'updated_at'> | null> {
  return queryOne<Pick<UserRow, 'id' | 'email' | 'role' | 'created_at' | 'updated_at'>>(
    'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1',
    [userId],
  );
}

async function registerUser(email: string, password: string): Promise<Pick<UserRow, 'id' | 'email' | 'role' | 'created_at' | 'updated_at'>> {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = crypto.randomUUID();

  const createdUser = await queryOne<Pick<UserRow, 'id' | 'email' | 'role' | 'created_at' | 'updated_at'>>(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, $2, $3, 'user')
     RETURNING id, email, role, created_at, updated_at`,
    [userId, email, passwordHash],
  );

  if (!createdUser) {
    throw new Error('Unable to register user');
  }

  return createdUser;
}

async function loginUser(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: Pick<UserRow, 'id' | 'email' | 'role' | 'created_at' | 'updated_at'> }> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new Error('Invalid email or password');
  }

  const tokenPair = await createRefreshToken(user.id);
  await storeRefreshToken(user.id, tokenPair.token, tokenPair.tokenId, tokenPair.expiresAt);

  const accessToken = await createAccessToken(user);
  const publicUser = await findUserById(user.id);
  if (!publicUser) {
    throw new Error('Unable to load user profile');
  }

  return { accessToken, refreshToken: tokenPair.token, user: publicUser };
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET as string);
  } catch {
    throw new Error('Invalid refresh token');
  }

  const typedPayload = payload as RefreshTokenPayload;
  if (!typedPayload.sub || !typedPayload.tokenId) {
    throw new Error('Invalid refresh token');
  }

  const tokenRow = await queryOne<RefreshTokenRow>(
    'SELECT id, user_id, token_id, token_hash, expires_at, created_at FROM refresh_tokens WHERE token_id = $1 AND user_id = $2',
    [typedPayload.tokenId, typedPayload.sub],
  );

  if (!tokenRow) {
    throw new Error('Refresh token not recognized');
  }

  if (tokenRow.expires_at.getTime() < Date.now()) {
    await deleteRefreshTokenById(typedPayload.tokenId);
    throw new Error('Refresh token expired');
  }

  if (tokenRow.token_hash !== hashRefreshToken(refreshToken)) {
    throw new Error('Refresh token mismatch');
  }

  const user = await findUserById(typedPayload.sub);
  if (!user) {
    throw new Error('User not found');
  }

  await deleteRefreshTokenById(typedPayload.tokenId);
  const newTokenPair = await createRefreshToken(user.id);
  const userForToken = await findUserByEmail(user.email);
  if (!userForToken) {
    throw new Error('User not found');
  }

  await storeRefreshToken(user.id, newTokenPair.token, newTokenPair.tokenId, newTokenPair.expiresAt);

  return {
    accessToken: await createAccessToken(userForToken),
    refreshToken: newTokenPair.token,
  };
}

function ensureAuthenticatedRequest(request: AuthenticatedRequest, _response: Response, next: NextFunction): void {
  const header = request.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    next(new Error('Missing bearer token'));
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as AccessTokenPayload;
    if (!decoded.sub || !decoded.email) {
      next(new Error('Invalid access token'));
      return;
    }

    request.user = { id: decoded.sub, email: decoded.email, role: (decoded as JwtPayload).role as string ?? 'user' };
    next();
  } catch {
    next(new Error('Invalid access token'));
  }
}

function handleError(response: Response, error: unknown, defaultStatus: number, defaultMessage: string): void {
  response.status(defaultStatus).json({ error: error instanceof Error ? error.message : defaultMessage });
}

app.post('/api/auth/register', async (request: Request, response: Response) => {
  try {
    const { email, password } = request.body as { email?: string; password?: string };
    if (!email || !password) {
      sendError(response, 400, 'email and password are required');
      return;
    }

    if (!isValidEmail(email) || password.length < 8) {
      sendError(response, 400, 'Invalid email or password format');
      return;
    }

    const user = await registerUser(email.toLowerCase(), password);
    response.status(201).json({ user });
  } catch (error) {
    handleError(response, error, 400, 'Unable to register user');
  }
});

app.post('/api/auth/login', async (request: Request, response: Response) => {
  try {
    const { email, password } = request.body as { email?: string; password?: string };
    if (!email || !password) {
      sendError(response, 400, 'email and password are required');
      return;
    }

    const result = await loginUser(email.toLowerCase(), password);
    response.cookie('refresh_token', result.refreshToken, getRefreshCookieOptions());
    response.status(200).json({ accessToken: result.accessToken, user: result.user });
  } catch (error) {
    handleError(response, error, 401, 'Unable to log in');
  }
});

app.post('/api/auth/refresh', async (request: Request, response: Response) => {
  try {
    const refreshToken = request.cookies.refresh_token as string | undefined;
    if (!refreshToken) {
      sendError(response, 401, 'Refresh token is required');
      return;
    }

    const result = await refreshAccessToken(refreshToken);
    response.cookie('refresh_token', result.refreshToken, getRefreshCookieOptions());
    response.status(200).json({ accessToken: result.accessToken });
  } catch (error) {
    handleError(response, error, 401, 'Unable to refresh token');
  }
});

app.get('/api/auth/me', ensureAuthenticatedRequest, async (request: AuthenticatedRequest, response: Response) => {
  try {
    if (!request.user) {
      sendError(response, 401, 'Unauthorized');
      return;
    }

    const user = await findUserById(request.user.id);
    if (!user) {
      sendError(response, 404, 'User not found');
      return;
    }

    response.status(200).json({ user });
  } catch {
    sendError(response, 500, 'Unable to load user profile');
  }
});

app.get('/health', async (_request: Request, response: Response) => {
  response.status(200).json({ status: 'ok' });
});

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  const statusCode = error.message === 'Missing bearer token' || error.message === 'Invalid access token' ? 401 : 500;
  response.status(statusCode).json({ error: error.message });
});

async function runMigrationsOnly(): Promise<void> {
  await ensureSchema();
  await pool.end();
}

async function main(): Promise<void> {
  await ensureSchema();

  app.listen(PORT, () => {
    console.log(`JWT service listening on port ${PORT}`);
  });
}

if (process.argv.includes('--migrate-only')) {
  runMigrationsOnly().catch(async (error: unknown) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
} else {
  main().catch(async (error: unknown) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
}
