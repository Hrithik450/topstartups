import { NextResponse } from "next/server";
import { getAllFloorLocks } from "@/lib/db/locks";

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
