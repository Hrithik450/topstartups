import type { ConnectionOptions } from "tls";

/**
 * Configure PostgreSQL SSL based on the host.
 * - Localhost / 127.0.0.1 / docker internal -> no SSL
 * - Supabase / Neon / AWS RDS / other cloud -> SSL with rejectUnauthorized: false
 */
export function getPostgresSsl(
  connectionString?: string
): boolean | ConnectionOptions {
  if (!connectionString) {
    return false;
  }

  // Local development does not require SSL
  if (
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1") ||
    connectionString.includes("@postgres:")
  ) {
    return false;
  }

  // Explicitly disabled via query param
  if (connectionString.includes("sslmode=disable")) {
    return false;
  }

  // Cloud hosted databases (Supabase, Neon, RDS, etc.) require SSL
  return {
    rejectUnauthorized: false,
  };
}
