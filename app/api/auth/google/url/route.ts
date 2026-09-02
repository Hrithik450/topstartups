import { NextRequest, NextResponse } from "next/server";
import { generateGoogleAuthUrl } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const returnTo = searchParams.get("return_to") || "/";

    // Determine current host for redirect_uri
    const host = req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const redirectUri = `${proto}://${host}/api/auth/google/callback`;

    // Encode return_to into state
    const state = Buffer.from(JSON.stringify({ returnTo })).toString("base64url");
    const authUrl = generateGoogleAuthUrl(redirectUri, state);

    if (searchParams.get("format") === "json") {
      return NextResponse.json({ success: true, url: authUrl });
    }

    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    console.error("Error generating Google Auth URL:", err);
    return NextResponse.json(
      { error: err.message || "Failed to initialize Google login" },
      { status: 500 }
    );
  }
}
