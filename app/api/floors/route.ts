import { NextRequest, NextResponse } from "next/server";
import { FloorsService } from "@/actions/floors/floors.service";
import { extractRootHostname } from "@/lib/validation/domain";

export const dynamic = "force-dynamic";

/**
 * GET /api/floors
 * Fetch all active skyscraper floors, or look up a specific floor by ?domain=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domainQuery = searchParams.get("domain") || searchParams.get("url");

    if (domainQuery) {
      const cleanHost = extractRootHostname(domainQuery);
      const floorRes = await FloorsService.getFloorByDomain(cleanHost);
      return NextResponse.json(floorRes);
    }

    const res = await FloorsService.getFloors();
    return NextResponse.json(
      {
        success: res.success,
        floors: res.data || [],
        totalCount: res.totalCount || 0,
        locks: {},
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    console.error("Error in /api/floors GET:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch floors", floors: [], locks: {} },
      { status: 500 }
    );
  }
}

/**
 * POST /api/floors
 * Domain-specific outbid pricing inquiry: returns required price and floor status for a domain
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = body.companyUrl || body.url || body.domain || "";
    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json({ error: "Domain or URL is required" }, { status: 400 });
    }

    const cleanHost = extractRootHostname(rawUrl);
    const pricing = await FloorsService.getOutbidPricing(cleanHost);

    return NextResponse.json({
      success: true,
      domain: cleanHost,
      ...pricing,
    });
  } catch (err: any) {
    console.error("Error in /api/floors POST:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to get domain pricing" },
      { status: 500 }
    );
  }
}
