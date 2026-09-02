/**
 * SSL for PostgreSQL pool connection:
 * Works seamlessly with local Docker Postgres (no SSL) and Cloud/Supabase (SSL required).
 *
 * - DATABASE_SSL=true|false  → explicit override
 * - otherwise: no SSL for localhost / docker hosts; SSL with rejectUnauthorized: false for cloud.
 */
export function getPostgresSsl(
  connectionString: string,
): false | { rejectUnauthorized: boolean } {
  const explicit = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (explicit === "false" || explicit === "0" || explicit === "off") {
    return false;
  }
  if (explicit === "true" || explicit === "1" || explicit === "on") {
    return { rejectUnauthorized: false };
  }

  try {
    const host = new URL(connectionString).hostname;
    const localHosts = new Set([
      "localhost",
      "127.0.0.1",
      "::1",
      "postgres",
      "host.docker.internal",
    ]);
    if (localHosts.has(host)) return false;
  } catch {
    // Default to SSL for cloud / external hosts
  }

  return { rejectUnauthorized: false };
}
