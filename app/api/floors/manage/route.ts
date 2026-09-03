import { NextRequest, NextResponse } from "next/server";
import {
  getFloorsByEmail,
  updateFloorByEmail,
  deleteFloorByEmail,
} from "@/lib/db/floors";
import { verifyWebsiteLive } from "@/lib/validation/domain";
import { getAuthenticatedUser } from "@/lib/auth/session";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function verifySessionSignature(email: string, token: string): boolean {
  const secret = process.env.SESSION_SECRET || "getopfloor_secure_session_secret";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(email.toLowerCase().trim())
    .digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(token.trim(), "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function resolveAuthorizedEmail(req: NextRequest, emailParam?: string | null, tokenParam?: string | null): string | null {
  // 1. Check Google user session cookie
  const googleSession = getAuthenticatedUser(req);
  if (googleSession?.email) {
    return googleSession.email.toLowerCase().trim();
  }

  // 2. Check Email OTP session signature
  if (emailParam && tokenParam && verifySessionSignature(emailParam, tokenParam)) {
    return emailParam.toLowerCase().trim();
  }

  return null;
}

/**
 * GET /api/floors/manage?email=...&session_token=...
 * Fetch claimed floors for verified owner (via Google session or OTP token)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const sessionToken = searchParams.get("session_token");

  const authorizedEmail = resolveAuthorizedEmail(req, email, sessionToken);
  if (!authorizedEmail) {
    return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
  }

  const floors = await getFloorsByEmail(authorizedEmail);
  return NextResponse.json({ success: true, floors });
}

/**
 * PATCH /api/floors/manage
 * Update claimed website/startup details
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      floorId,
      email,
      sessionToken,
      companyName,
      url,
      category,
      tagline,
      description,
      logoUrl,
    } = body;

    if (!floorId) {
      return NextResponse.json({ error: "Floor ID is required" }, { status: 400 });
    }

    const authorizedEmail = resolveAuthorizedEmail(req, email, sessionToken);
    if (!authorizedEmail) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    let verifiedUrl: string | undefined = undefined;
    if (url && typeof url === "string" && url.trim()) {
      const verification = await verifyWebsiteLive(url.trim());
      if (!verification.valid || !verification.cleanUrl) {
        return NextResponse.json(
          { error: verification.error || "Insecure or invalid website URL" },
          { status: 400 }
        );
      }
      verifiedUrl = verification.cleanUrl;
    }

    const updated = await updateFloorByEmail(String(floorId), authorizedEmail, {
      companyName,
      url: verifiedUrl,
      category,
      tagline,
      description,
      logoUrl,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Floor not found or you are not authorized to update it." },
        { status: 404 }
      );
    }

    try {
      const { revalidateTag } = await import("next/cache");
      revalidateTag("floors");
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Floor updated successfully",
      floor: updated,
    });
  } catch (err: any) {
    console.error("Error updating floor:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update floor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/floors/manage
 * Vacate and reset a claimed floor back to open slot
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { floorId, email, sessionToken } = body;

    if (!floorId) {
      return NextResponse.json({ error: "Floor ID is required" }, { status: 400 });
    }

    const authorizedEmail = resolveAuthorizedEmail(req, email, sessionToken);
    if (!authorizedEmail) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const vacated = await deleteFloorByEmail(String(floorId), authorizedEmail);
    if (!vacated) {
      return NextResponse.json(
        { error: "Floor not found or you are not authorized to vacate it." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Floor successfully vacated and reset to open slot.",
    });
  } catch (err: any) {
    console.error("Error vacating floor:", err);
    return NextResponse.json(
      { error: err.message || "Failed to vacate floor" },
      { status: 500 }
    );
  }
}
