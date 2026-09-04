import { NextRequest, NextResponse } from "next/server";
import { StatsService } from "@/actions/stats/stats.service";

import { auth } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await StatsService.getLiveStats();
  return NextResponse.json({ success: res.success, stats: res.data, error: res.error });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = body.sessionId || req.headers.get("x-session-id") || "anonymous";

    const countryCode =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-country-code") ||
      body.countryCode ||
      null;

    const countryName = body.countryName || null;
    const isNewSession = Boolean(body.isNewSession ?? body.isInitialView);

    const session = await auth().catch(() => null);
    const userId = session?.user?.id || null;

    await StatsService.recordPing({
      sessionId,
      countryCode,
      countryName,
      isNewSession,
      userId,
    });

    const res = await StatsService.getLiveStats();
    return NextResponse.json({ success: res.success, stats: res.data, error: res.error });
  } catch (err: any) {
    const res = await StatsService.getLiveStats();
    return NextResponse.json({ success: res.success, stats: res.data });
  }
}
