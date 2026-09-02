import { db } from "@/lib/db/client";
import { users, type User } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export function getGoogleCredentials() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";

  return { clientId, clientSecret };
}

/**
 * Generate direct Google OAuth 2.0 Authorization URL (Zero third-party library).
 */
export function generateGoogleAuthUrl(redirectUri: string, state?: string): string {
  const { clientId } = getGoogleCredentials();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured in environment variables");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    ...(state ? { state } : {}),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Direct token exchange with Google OAuth 2.0 endpoint.
 */
export async function exchangeGoogleCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; idToken?: string }> {
  const { clientId, clientSecret } = getGoogleCredentials();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials (CLIENT_ID / CLIENT_SECRET) not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google token exchange error:", response.status, errText);
    throw new Error("Failed to exchange authorization code with Google");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    idToken: data.id_token,
  };
}

/**
 * Fetch verified user profile directly from Google OpenID userinfo endpoint.
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user profile from Google");
  }

  const profile: GoogleProfile = await response.json();
  if (!profile.email) {
    throw new Error("No verified email received from Google profile");
  }

  return profile;
}

/**
 * Upsert verified Google user into PostgreSQL 'users' table using pure Drizzle ORM.
 */
export async function syncGoogleUserToDb(profile: GoogleProfile): Promise<User> {
  const cleanEmail = profile.email.toLowerCase().trim();
  const name = profile.name || cleanEmail.split("@")[0] || "Founder";
  const avatarUrl = profile.picture || null;

  const [upserted] = await db
    .insert(users)
    .values({
      email: cleanEmail,
      name,
      avatarUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name,
        ...(avatarUrl ? { avatarUrl } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  return upserted;
}
