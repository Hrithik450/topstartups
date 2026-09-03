import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { releaseFloorLock } from "@/lib/db/locks";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedUser();
    const body = await req.json().catch(() => ({}));
    const targetRank = Number(body.targetRank) || 1;
    const email = session?.email || body.email || null;

    if (email) {
      await releaseFloorLock(targetRank, null, null, email);
    } else {
      await releaseFloorLock(targetRank);
    }

    return NextResponse.json({ success: true, message: "Lock released" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
