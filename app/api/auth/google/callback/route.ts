import { NextRequest, NextResponse } from "next/server";
import {
  exchangeGoogleCodeForTokens,
  fetchGoogleUserProfile,
  syncGoogleUserToDb,
} from "@/lib/auth/google";
import { createUserSessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const errorParam = searchParams.get("error");

    // Decode state
    let returnTo = "/";
    if (stateParam) {
      try {
        const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8"));
        if (decoded.returnTo && typeof decoded.returnTo === "string" && decoded.returnTo.startsWith("/")) {
          returnTo = decoded.returnTo;
        }
      } catch {
        returnTo = "/";
      }
    }

    if (errorParam) {
      console.warn("Google OAuth canceled or denied:", errorParam);
      return NextResponse.redirect(new URL(`${returnTo}?auth_error=${encodeURIComponent(errorParam)}`, req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL(`${returnTo}?auth_error=missing_code`, req.url));
    }

    const host = req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const redirectUri = `${proto}://${host}/api/auth/google/callback`;

    // 1. Direct Token Exchange
    const { accessToken } = await exchangeGoogleCodeForTokens(code, redirectUri);

    // 2. Direct Profile Fetch from Google
    const profile = await fetchGoogleUserProfile(accessToken);

    // 3. Upsert user in PostgreSQL DB via Drizzle
    const dbUser = await syncGoogleUserToDb(profile);

    // 4. Create signed HMAC session token
    const sessionToken = createUserSessionToken({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatarUrl: dbUser.avatarUrl,
    });

    // 5. Set HTTP-only Cookie and Redirect
    const response = NextResponse.redirect(new URL(returnTo, req.url));
    const isProd = process.env.NODE_ENV === "production";

    response.cookies.set("user_session", sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error("Google Auth callback error:", err);
    return NextResponse.redirect(new URL("/?auth_error=failed", req.url));
  }
}
