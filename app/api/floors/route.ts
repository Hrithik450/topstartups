import { NextResponse } from "next/server";
import { getActiveFloors } from "@/lib/db/floors";
import { getAllFloorLocks } from "@/lib/db/locks";
import { createDefaultPlaceholderListings } from "@/lib/three/listings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [floors, locks] = await Promise.all([
      getActiveFloors(),
      getAllFloorLocks(),
    ]);

    if (floors && floors.length > 0) {
      const enrichedFloors = floors.map((f) => {
        const lock = locks[f.rank];
        if (lock && lock.isLocked) {
          return {
            ...f,
            isLocked: true,
            originalDescription: f.description,
            description: "⚡ Someone is claiming this floor right now...",
            lockInfo: lock,
          };
        }
        return {
          ...f,
          isLocked: false,
        };
      });

      return NextResponse.json({
        success: true,
        floors: enrichedFloors,
        locks,
        lock: locks[1] || { isLocked: false },
        totalCount: enrichedFloors.length,
      });
    }

    return NextResponse.json({
      success: true,
      floors: [],
      locks: {},
      lock: { isLocked: false },
      totalCount: 0,
    });
  } catch (err: any) {
    console.error("Error in /api/floors:", err?.message);
    return NextResponse.json({
      success: true,
      floors: [],
      locks: {},
      lock: { isLocked: false },
      totalCount: 0,
    });
  }
}
