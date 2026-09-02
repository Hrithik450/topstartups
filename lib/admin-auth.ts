import crypto from "crypto";

export function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL || "admin@getopfloor.com";
  const password = process.env.ADMIN_PASSWORD || "admin12345";
  return { email: email.toLowerCase().trim(), password };
}

export function createAdminToken(email: string): string {
  const secret = process.env.SESSION_SECRET || "getopfloor_secure_session_secret";
  return crypto.createHmac("sha256", secret).update(`admin:${email}`).digest("hex");
}

export function verifyAdminToken(token?: string | null): boolean {
  if (!token) return false;
  const { email } = getAdminCredentials();
  const expected = createAdminToken(email);
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(token.trim(), "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
