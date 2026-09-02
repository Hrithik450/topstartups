import type { ConnectionOptions } from "tls";

/**
 * Configure PostgreSQL SSL based on the host and environment.
 * Supports:
 * - VPS (self-hosted PostgreSQL, Docker, Dokku, Coolify, PM2)
 * - Local development (localhost, 127.0.0.1)
 * - Cloud providers (Supabase, Neon, AWS RDS, Railway, Render)
 */
export function getPostgresSsl(
  connectionString?: string
): boolean | ConnectionOptions {
  // 1. Explicit override via environment variables
  const envSsl = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (envSsl === "false" || envSsl === "0" || envSsl === "no" || envSsl === "disable") {
    return false;
  }
  if (envSsl === "true" || envSsl === "1" || envSsl === "yes" || envSsl === "require") {
    return { rejectUnauthorized: false };
  }

  const pgSslMode = process.env.PGSSLMODE?.trim().toLowerCase();
  if (pgSslMode === "disable") {
    return false;
  }
  if (pgSslMode === "require" || pgSslMode === "no-verify") {
    return { rejectUnauthorized: false };
  }

  if (!connectionString) {
    return false;
  }

  // 2. Explicitly disabled via connection string query parameters
  if (
    connectionString.includes("sslmode=disable") ||
    connectionString.includes("ssl=false")
  ) {
    return false;
  }

  // 3. Localhost / VPS Loopback addresses
  if (
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1") ||
    connectionString.includes("[::1]")
  ) {
    return false;
  }

  // 4. Docker internal networks & private hostnames commonly used on VPS
  // e.g. @db:, @postgres:, @database:, *.docker.internal, *.local
  if (
    connectionString.includes("@postgres:") ||
    connectionString.includes("@db:") ||
    connectionString.includes("@database:") ||
    connectionString.includes("@outbid-db:") ||
    connectionString.includes(".docker.internal") ||
    connectionString.includes(".local:") ||
    connectionString.includes(".internal:")
  ) {
    return false;
  }

  // 5. Private IPv4 ranges (RFC 1918) commonly used in VPS private networks:
  // 10.x.x.x, 172.16-31.x.x, 192.168.x.x
  const privateIpRegex = /@(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):/;
  if (privateIpRegex.test(connectionString)) {
    return false;
  }

  // 6. Explicitly required via connection string
  if (
    connectionString.includes("sslmode=require") ||
    connectionString.includes("sslmode=prefer") ||
    connectionString.includes("ssl=true")
  ) {
    return { rejectUnauthorized: false };
  }

  // 7. Cloud hosted providers (Supabase, Neon, AWS RDS, Railway, Render, etc.)
  // Default to SSL with rejectUnauthorized: false to support cloud poolers and self-signed certs
  return {
    rejectUnauthorized: false,
  };
}
