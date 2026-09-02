import { NextRequest, NextResponse } from "next/server";

/**
 * SECURITY: In-memory IP-based rate limiter for API routes.
 * Protects against brute-force attacks, DDoS, and checkout spam.
 *
 * For production at scale, consider replacing with @upstash/ratelimit
 * or Cloudflare/Vercel rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Rate limit configs per route pattern (requests per window)
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/checkout": { max: 10, windowMs: 60_000 }, // 10 checkouts/min
  "/api/floors/manage": { max: 15, windowMs: 60_000 }, // 15 manage ops/min
  "/api/webhooks": { max: 50, windowMs: 60_000 }, // 50 webhooks/min
  "/api/floors": { max: 60, windowMs: 60_000 }, // 60 reads/min
  "/api/": { max: 30, windowMs: 60_000 }, // 30 default/min
};

function getRateLimitConfig(pathname: string) {
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(pattern)) return config;
  }
  return RATE_LIMITS["/api/"];
}

// Periodic cleanup to prevent memory leak (every 5 minutes)
let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) rateLimitMap.delete(key);
  }
}

export function middleware(req: NextRequest) {
  // Only rate-limit API routes
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  cleanupStaleEntries();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const config = getRateLimitConfig(req.nextUrl.pathname);
  const key = `${ip}:${req.nextUrl.pathname.split("/").slice(0, 4).join("/")}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
    return NextResponse.next();
  }

  entry.count++;
  if (entry.count > config.max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": config.max.toString(),
          "X-RateLimit-Reset": new Date(entry.resetTime).toISOString(),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
