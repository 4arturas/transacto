export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@txn-db:5432/transaction_processor',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
};
