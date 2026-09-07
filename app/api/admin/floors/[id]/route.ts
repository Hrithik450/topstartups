import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { FloorsService } from "@/actions/floors/floors.service";

export const dynamic = "force-dynamic";

function isAuthenticatedAdmin(req: NextRequest): boolean {
  const cookieToken = req.cookies.get("admin_session")?.value;
  const authHeader = req.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const token = cookieToken || bearerToken;
  return verifyAdminToken(token);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAuthenticatedAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
    }

    const { id } = await params;
    if (!id || typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ error: "Floor ID is required" }, { status: 400 });
    }

    const result = await FloorsService.adminDeleteFloor(id.trim());
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to vacate floor" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err: any) {
    console.error("Error in admin floor DELETE:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
