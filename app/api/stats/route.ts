import { NextRequest, NextResponse } from "next/server";
import { getLiveStats, recordVisitAndPing } from "@/lib/db/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getLiveStats();
  return NextResponse.json({ success: true, stats });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = body.sessionId || req.headers.get("x-session-id") || "anonymous";

    // Extract country code from cloud edge headers or client payload
    const countryCode =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-country-code") ||
      body.countryCode ||
      null;

    const countryName = body.countryName || null;
    const isNewSession = Boolean(body.isNewSession ?? body.isInitialView);

    await recordVisitAndPing(sessionId, countryCode, countryName, isNewSession);
    const stats = await getLiveStats();

    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    console.error("Error in stats ping:", err);
    const stats = await getLiveStats();
    return NextResponse.json({ success: true, stats });
  }
}
