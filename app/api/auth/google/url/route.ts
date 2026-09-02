import { NextRequest, NextResponse } from "next/server";
import { generateGoogleAuthUrl, getGoogleRedirectUri } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const returnTo = searchParams.get("return_to") || "/";

    // Matches Google Cloud Console configured redirect URI
    const redirectUri = getGoogleRedirectUri(req);

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
