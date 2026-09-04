import { Pool } from "pg";
import * as schema from "./schema";
import { getPostgresSsl } from "./ssl";
import { getPoolConfig, getRuntimeDatabaseUrl } from "./pool-config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

export type AppDatabase = NodePgDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _dbInstance: AppDatabase | undefined;
}

function createDb(): AppDatabase {
  if (globalThis._dbInstance) {
    return globalThis._dbInstance;
  }

  const connectionString = getRuntimeDatabaseUrl();
  const ssl = getPostgresSsl(connectionString);

  const pool = new Pool({
    ...getPoolConfig(connectionString),
    ssl: ssl === false ? undefined : ssl,
  });

  // Handle unexpected idle client errors (e.g. ETIMEDOUT / ECONNRESET when Supabase or network drops idle TCP sockets)
  // node-postgres will automatically discard the dead client from the pool.
  pool.on("error", (err) => {
    console.warn("PostgreSQL idle client connection warning (auto-recovering):", err?.message || err);
  });

  globalThis._pgPool = pool;
  globalThis._dbInstance = drizzle(pool, { schema });
  return globalThis._dbInstance;
}

/**
 * Lazy DB accessor:
 * Allows Next.js build / route bundling to succeed cleanly even before
 * DATABASE_URL is injected in production or Docker containers.
 */
export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, prop, receiver) {
    const instance = globalThis._dbInstance ?? createDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  getPrototypeOf(_target) {
    const instance = globalThis._dbInstance ?? createDb();
    return Object.getPrototypeOf(instance);
  },
});
