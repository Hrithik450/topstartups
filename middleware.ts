import { NextRequest, NextResponse } from "next/server";

/**
 * ENTERPRISE SECURITY MIDDLEWARE
 * - Real client IP detection (Cloudflare, Vercel, Proxies)
 * - Anti-flood rate limiting per route and HTTP method
 * - Known exploit scanner & bot blocker
 * - Payload size limit enforcement (Anti-DoS)
 * - Security response headers
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Known malicious vulnerability scanners and exploit bots
const BLOCKED_USER_AGENTS = [
  "sqlmap",
  "nikto",
  "masscan",
  "zgrab",
  "acunetix",
  "dirbuster",
  "gobuster",
  "nmap",
  "wpscan",
  "hydra",
  "havij",
  "censys",
  "shodan",
  "metasploit",
];

// Granular rate limits per route and method (max requests per windowMs)
const ROUTE_LIMITS: { pattern: string; method?: string; max: number; windowMs: number }[] = [
  // Admin login brute-force protection: max 5 attempts per 15 minutes
  { pattern: "/api/admin/login", method: "POST", max: 5, windowMs: 15 * 60_000 },
  // URL live validator: max 12 requests per minute (prevents SSRF scanning)
  { pattern: "/api/validate-url", method: "POST", max: 12, windowMs: 60_000 },
  // Checkout creation: max 6 checkouts per minute per IP
  { pattern: "/api/checkout", method: "POST", max: 6, windowMs: 60_000 },
  // Floor asset upload: max 6 uploads per minute per IP
  { pattern: "/api/upload", method: "POST", max: 6, windowMs: 60_000 },
  // Floor management / edits: max 12 requests per minute per IP
  { pattern: "/api/floors/manage", method: "POST", max: 12, windowMs: 60_000 },
  // Auth operations: max 15 requests per minute
  { pattern: "/api/auth", max: 15, windowMs: 60_000 },
  // Webhooks: high throughput for verified payment provider
  { pattern: "/api/webhooks", max: 100, windowMs: 60_000 },
  // General POST / mutation endpoints: max 25 requests per minute
  { pattern: "/api/", method: "POST", max: 25, windowMs: 60_000 },
  // General GET / read endpoints: max 120 requests per minute
  { pattern: "/api/", max: 120, windowMs: 60_000 },
];

function getRateLimitRule(pathname: string, method: string) {
  for (const rule of ROUTE_LIMITS) {
    if (pathname.startsWith(rule.pattern)) {
      if (!rule.method || rule.method.toUpperCase() === method.toUpperCase()) {
        return rule;
      }
    }
  }
  return { pattern: "/api/", max: 60, windowMs: 60_000 };
}

// Periodic cleanup to prevent memory leaks (every 3 minutes)
let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < 180_000) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) rateLimitMap.delete(key);
  }
}

/**
 * Extracts true client IP prioritizing Cloudflare, Vercel, and trusted proxies
 */
function getClientIp(req: NextRequest): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) return cfIp.trim();

  const vercelIp = req.headers.get("x-vercel-ip");
  if (vercelIp && vercelIp.trim()) return vercelIp.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return (req as any).ip || "127.0.0.1";
}

export function middleware(req: NextRequest) {
  // Only apply to API routes
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const userAgent = (req.headers.get("user-agent") || "").toLowerCase();

  // 1. BLOCK KNOWN MALICIOUS SCANNERS
  if (BLOCKED_USER_AGENTS.some((bot) => userAgent.includes(bot))) {
    return NextResponse.json(
      { error: "Access Denied: Malicious activity detected." },
      { status: 403 }
    );
  }

  // 2. ENFORCE BODY SIZE LIMITS (Anti-Memory Exhaustion / DoS)
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    const isUploadRoute = req.nextUrl.pathname.startsWith("/api/upload");
    const maxAllowedBytes = isUploadRoute ? 5 * 1024 * 1024 : 128 * 1024; // 5MB for upload, 128KB for JSON

    if (bytes > maxAllowedBytes) {
      return NextResponse.json(
        { error: "Payload Too Large. Request rejected." },
        { status: 413 }
      );
    }
  }

  // 3. RATE LIMITING ENGINE
  cleanupStaleEntries();

  const ip = getClientIp(req);
  const method = req.method.toUpperCase();
  const rule = getRateLimitRule(req.nextUrl.pathname, method);
  const rateLimitKey = `${ip}:${method}:${rule.pattern}`;
  const now = Date.now();

  const entry = rateLimitMap.get(rateLimitKey);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + rule.windowMs });
    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit", rule.max.toString());
    res.headers.set("X-RateLimit-Remaining", (rule.max - 1).toString());
    return res;
  }

  entry.count++;
  const remaining = Math.max(0, rule.max - entry.count);

  // If rate limit exceeded -> 429 Too Many Requests
  if (entry.count > rule.max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: "Too many requests. Please slow down and try again later.",
        retryAfterSeconds: retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": rule.max.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(entry.resetTime).toISOString(),
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      }
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", rule.max.toString());
  res.headers.set("X-RateLimit-Remaining", remaining.toString());
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
