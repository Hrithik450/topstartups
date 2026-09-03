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
  } catch (err: any) {
    console.warn(
      "Database unavailable or credentials failed, serving default placeholder floors:",
      err?.message
    );
  }

  // Graceful fallback: return 50 premium placeholder floors with status 200
  const fallbackFloors = createDefaultPlaceholderListings().map((l) => ({
    id: l.id,
    rank: l.rank,
    isClaimed: l.is_claimed,
    companyName: l.title,
    url: l.url_or_handle,
    category: l.category,
    tagline: l.description,
    description: l.description,
    pricePaid: l.total_paid,
    claimedAt: null,
  }));

  return NextResponse.json({
    success: true,
    floors: fallbackFloors,
    totalCount: fallbackFloors.length,
    isFallback: true,
  });
}
