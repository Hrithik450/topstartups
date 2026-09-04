import type { PoolConfig } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * Supabase (and PostgreSQL) multi-tier connection handling:
 * - Direct :5432 — migrations, seed scripts, local development, VPS direct
 * - Transaction pooler :6543 (Supavisor / dedicated PgBouncer) — serverless / edge / Vercel
 * - Session pooler :5432 on *.pooler.supabase.com — persistent backends
 *
 * Transaction mode does not support named prepared statements.
 * node-postgres uses unnamed extended protocol queries by default, which is
 * 100% compatible with Supabase Transaction Poolers (:6543) over both IPv4 and IPv6.
 */

const TRANSACTION_POOLER_PORT = "6543";

/** Strip Prisma-style / non-libpq query flags that confuse `pg`. */
export function sanitizeDatabaseUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("pgbouncer");
    url.searchParams.delete("connection_limit");
    url.searchParams.delete("pool_timeout");
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function isTransactionPoolerUrl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    if (url.port === TRANSACTION_POOLER_PORT) return true;
    if (url.searchParams.get("pgbouncer") === "true") return true;
    return false;
  } catch {
    return /:6543(\/|\?|$)/.test(connectionString);
  }
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Pool settings safe for VPS, container, and Supabase transaction pooler.
 */
export function getPoolConfig(connectionString: string): PoolConfig {
  const usingTransactionPooler = isTransactionPoolerUrl(connectionString);
  const onVercel = Boolean(process.env.VERCEL);

  const defaultMax = usingTransactionPooler || onVercel ? 1 : 10;

  return {
    connectionString: sanitizeDatabaseUrl(connectionString),
    max: envInt("DATABASE_POOL_MAX", defaultMax),
    idleTimeoutMillis: envInt("DATABASE_POOL_IDLE_MS", onVercel ? 10_000 : 30_000),
    connectionTimeoutMillis: envInt("DATABASE_POOL_CONNECT_MS", 10_000),
    allowExitOnIdle: onVercel || usingTransactionPooler,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  };
}

/** Runtime URL (prefer transaction pooler or standard connection). */
export function getRuntimeDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    // Fallback for local development if not set
    return "postgresql://postgres:postgres@127.0.0.1:5432/outbid";
  }
  return url;
}

/** Direct URL for migrations / seeding / schema pushes. */
export function getDirectDatabaseUrl(): string {
  return (
    process.env.DATABASE_DIRECT_URL?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    getRuntimeDatabaseUrl()
  );
}
