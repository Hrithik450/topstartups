import { Pool } from "pg";
import * as schema from "./schema";
import { getPostgresSsl } from "./ssl";
import { getPoolConfig, getRuntimeDatabaseUrl } from "./pool-config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

export type AppDatabase = NodePgDatabase<typeof schema>;

let pool: Pool | null = null;
let dbInstance: AppDatabase | null = null;

function createDb(): AppDatabase {
  const connectionString = getRuntimeDatabaseUrl();
  const ssl = getPostgresSsl(connectionString);

  pool = new Pool({
    ...getPoolConfig(connectionString),
    ssl: ssl === false ? undefined : ssl,
  });

  // node-pg uses unnamed extended-protocol queries by default, which is
  // natively compatible with Supabase Transaction Pooler (:6543) and IPv6.
  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}

/**
 * Lazy DB accessor:
 * Allows Next.js build / route bundling to succeed cleanly even before
 * DATABASE_URL is injected in production or Docker containers.
 */
export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, prop, receiver) {
    const instance = dbInstance ?? createDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
