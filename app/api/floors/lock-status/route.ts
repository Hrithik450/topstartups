import { NextRequest, NextResponse } from "next/server";
import { getAllFloorLocks, releaseFloorLock } from "@/lib/db/locks";
import { db } from "@/lib/db/config/client";
import { floorLocks } from "@/lib/db/config/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const locks = await getAllFloorLocks();
    return NextResponse.json({
      success: true,
      locks,
      topFloorLock: locks[1] || { isLocked: false },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      locks: {},
      topFloorLock: { isLocked: false },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rank, paymentId, checkoutSessionId, email } = body;
    if (email && typeof email === "string" && email.trim()) {
      await db.delete(floorLocks).where(eq(floorLocks.lockedByEmail, email.toLowerCase().trim()));
    }
    if (rank) {
      await releaseFloorLock(Number(rank), paymentId, checkoutSessionId);
    }
    return NextResponse.json({ success: true, message: "Floor lock released" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rank = Number(searchParams.get("rank")) || 1;
    const paymentId = searchParams.get("payment_id");
    const checkoutSessionId = searchParams.get("session_id");
    const email = searchParams.get("email");

    if (email) {
      await db.delete(floorLocks).where(eq(floorLocks.lockedByEmail, email.toLowerCase().trim()));
    }
    await releaseFloorLock(rank, paymentId, checkoutSessionId);
    return NextResponse.json({ success: true, message: `Floor #${rank} lock released` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
