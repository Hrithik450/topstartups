import { NextResponse } from "next/server";
import { getActiveFloors } from "@/lib/db/floors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const floors = await getActiveFloors();
    return NextResponse.json({
      success: true,
      floors,
      totalCount: floors.length,
    });
  } catch (err: any) {
    console.error("Error fetching floors:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to fetch floors",
      },
      { status: 500 }
    );
  }
}
