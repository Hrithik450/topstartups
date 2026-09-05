import crypto from "crypto";

const DEFAULT_INSECURE_SECRET = "getopfloor_secure_session_secret";
const DEFAULT_INSECURE_PASS = "admin12345";

export function getAdminCredentials() {
  const isProd = process.env.NODE_ENV === "production";
  const email = (process.env.ADMIN_EMAIL || "admin@getopfloor.com").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || (isProd ? "" : DEFAULT_INSECURE_PASS);

  if (isProd && (!password || password === DEFAULT_INSECURE_PASS)) {
    console.error("CRITICAL SECURITY ERROR: ADMIN_PASSWORD must be configured with a strong password in production!");
  }

  return { email, password };
}

function getSessionSecret(): string {
  const isProd = process.env.NODE_ENV === "production";
  const secret = process.env.SESSION_SECRET || (isProd ? "" : DEFAULT_INSECURE_SECRET);

  if (isProd && (!secret || secret === DEFAULT_INSECURE_SECRET)) {
    console.error("CRITICAL SECURITY ERROR: SESSION_SECRET must be configured with a random 32+ character key in production!");
  }

  return secret || DEFAULT_INSECURE_SECRET;
}

/**
 * Creates an expiring admin session token with timestamp and cryptographic HMAC signature.
 */
export function createAdminToken(email: string): string {
  const secret = getSessionSecret();
  const timestamp = Date.now().toString(36);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`admin:${email}:${timestamp}`)
    .digest("hex");

  return `${timestamp}.${signature}`;
}

/**
 * Verifies admin session token with signature check and 7-day expiration.
 */
export function verifyAdminToken(token?: string | null): boolean {
  if (!token || typeof token !== "string") return false;
  const cleanToken = token.trim();

  // 1. Verify modern timestamped token (format: timestamp.signature)
  const parts = cleanToken.split(".");
  if (parts.length === 2) {
    const [timestampStr, receivedSig] = parts;
    const timestamp = parseInt(timestampStr, 36);
    if (isNaN(timestamp)) return false;

    // Token expires after 7 days (604,800,000 ms)
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - timestamp > MAX_AGE_MS || timestamp > now + 60000) {
      return false;
    }

    const { email } = getAdminCredentials();
    const secret = getSessionSecret();
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`admin:${email}:${timestampStr}`)
      .digest("hex");

    try {
      const a = Buffer.from(expectedSig, "utf8");
      const b = Buffer.from(receivedSig, "utf8");
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  return false;
}
