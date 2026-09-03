import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  exp: number;
}

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || "getopfloor_secure_user_session_secret_2026";
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Create a secure HMAC-signed user session token (30-day expiration).
 */
export function createUserSessionToken(user: {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}): string {
  const payload: SessionUser = {
    id: user.id,
    email: user.email.toLowerCase().trim(),
    name: user.name || null,
    avatarUrl: user.avatarUrl || null,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  const payloadStr = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadStr)
    .digest("hex");

  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode an HMAC-signed session token in constant time.
 */
export function verifyUserSessionToken(token?: string | null): SessionUser | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;

  try {
    const expectedSig = crypto
      .createHmac("sha256", getSessionSecret())
      .update(payloadStr)
      .digest("hex");

    const a = Buffer.from(expectedSig, "utf8");
    const b = Buffer.from(signature.trim(), "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payloadJson = base64UrlDecode(payloadStr);
    const session: SessionUser = JSON.parse(payloadJson);

    // Check expiration
    if (session.exp && Date.now() > session.exp) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Get the currently logged-in user from the incoming request or next/headers cookies.
 */
export function getAuthenticatedUser(req?: NextRequest): SessionUser | null {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get("user_session")?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7).trim();
      }
    }
  } else {
    try {
      token = cookies().get("user_session")?.value;
    } catch {
      token = undefined;
    }
  }

  return verifyUserSessionToken(token);
}
