import { NextRequest, NextResponse } from "next/server";
import { getAllFloorLocks, releaseFloorLock } from "@/lib/db/locks";

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
    const { rank, paymentId, checkoutSessionId } = body;
    await releaseFloorLock(Number(rank) || 1, paymentId, checkoutSessionId);
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

    await releaseFloorLock(rank, paymentId, checkoutSessionId);
    return NextResponse.json({ success: true, message: `Floor #${rank} lock released` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
