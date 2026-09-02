import { NextRequest, NextResponse } from "next/server";
import {
  getFloorByManageToken,
  updateFloorByManageToken,
  deleteFloorByManageToken,
  getFloorsByEmail,
  updateFloorByEmail,
  deleteFloorByEmail,
} from "@/lib/db/floors";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function verifySessionSignature(email: string, token: string): boolean {
  if (!email || !token) return false;
  const secret = process.env.SESSION_SECRET || "getopfloor_secure_session_secret";
  const expected = crypto.createHmac("sha256", secret).update(email.toLowerCase().trim()).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(token.trim(), "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * GET /api/floors/manage
 * Fetch claimed floors by email or manageToken
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.toLowerCase().trim();
  const sessionToken = searchParams.get("session_token");
  const token = searchParams.get("token");

  // Email-based lookup (preferred modern workflow)
  if (email) {
    if (!sessionToken || !verifySessionSignature(email, sessionToken)) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const floors = await getFloorsByEmail(email);
    return NextResponse.json({ success: true, floors });
  }

  // Token-based lookup (backward compatibility)
  if (token) {
    const floor = await getFloorByManageToken(token);
    if (!floor) {
      return NextResponse.json(
        { error: "No floor found for this management token" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, floor });
  }

  return NextResponse.json({ error: "Email or token is required" }, { status: 400 });
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
      token,
      companyName,
      url,
      category,
      tagline,
      description,
      logoUrl,
    } = body;

    // Email-based update (preferred)
    if (email && floorId) {
      const cleanEmail = email.toLowerCase().trim();
      if (!sessionToken || !verifySessionSignature(cleanEmail, sessionToken)) {
        return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
      }

      const updated = await updateFloorByEmail(Number(floorId), cleanEmail, {
        companyName,
        url,
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

      return NextResponse.json({
        success: true,
        message: "Floor updated successfully",
        floor: updated,
      });
    }

    // Legacy manageToken update
    if (token) {
      const updated = await updateFloorByManageToken(token, {
        companyName,
        url,
        category,
        tagline,
        description,
        logoUrl,
      });

      if (!updated) {
        return NextResponse.json(
          { error: "Floor not found or update failed" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Floor updated successfully",
        floor: updated,
      });
    }

    return NextResponse.json({ error: "Authentication credentials required" }, { status: 400 });
  } catch (err: any) {
    console.error("Error updating floor:", err);
    return NextResponse.json(
      { error: "Failed to update floor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/floors/manage
 * Vacate/Remove the website from the skyscraper floor
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);

    const email = (body.email || searchParams.get("email"))?.toLowerCase().trim();
    const floorId = body.floorId || searchParams.get("floor_id");
    const sessionToken = body.sessionToken || searchParams.get("session_token");
    const token = body.token || searchParams.get("token");

    // Email-based delete (preferred)
    if (email && floorId) {
      if (!sessionToken || !verifySessionSignature(email, sessionToken)) {
        return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
      }

      const result = await deleteFloorByEmail(Number(floorId), email);
      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    // Legacy manageToken delete
    if (token) {
      const result = await deleteFloorByManageToken(token);
      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Authentication credentials required" }, { status: 400 });
  } catch (err: any) {
    console.error("Error deleting floor:", err);
    return NextResponse.json(
      { error: "Failed to delete floor" },
      { status: 500 }
    );
  }
}
