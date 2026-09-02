import { NextRequest, NextResponse } from "next/server";
import {
  getFloorByManageToken,
  updateFloorByManageToken,
  deleteFloorByManageToken,
} from "@/lib/db/floors";

export const dynamic = "force-dynamic";

/**
 * GET /api/floors/manage?token=...
 * Fetch claimed floor details for the owner
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const floor = await getFloorByManageToken(token);
  if (!floor) {
    return NextResponse.json(
      { error: "No floor found for this management token" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, floor });
}

/**
 * PATCH /api/floors/manage
 * Update claimed website/startup details
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, companyName, url, category, tagline, description, logoUrl } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

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
  } catch (err: any) {
    console.error("Error updating floor:", err);
    return NextResponse.json(
      { error: "Failed to update floor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/floors/manage?token=...
 * Vacate/Remove the website from the skyscraper floor
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let token = searchParams.get("token");

    if (!token) {
      try {
        const body = await req.json();
        token = body.token;
      } catch {
        // query param was checked
      }
    }

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const result = await deleteFloorByManageToken(token);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error deleting floor:", err);
    return NextResponse.json(
      { error: "Failed to delete floor" },
      { status: 500 }
    );
  }
}
