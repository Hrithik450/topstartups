import { NextResponse } from "next/server";
import { getActiveFloors } from "@/lib/db/floors";
import { createDefaultPlaceholderListings } from "@/lib/three/listings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const floors = await getActiveFloors();
    if (floors && floors.length > 0) {
      return NextResponse.json({
        success: true,
        floors,
        totalCount: floors.length,
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
