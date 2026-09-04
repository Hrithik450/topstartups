import { NextRequest, NextResponse } from "next/server";
import { StatsService } from "@/actions/stats/stats.service";
import { getCanonicalCountry } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await StatsService.getLiveStats();
  return NextResponse.json(
    { success: res.success, stats: res.data, error: res.error },
    {
      headers: {
        "Cache-Control": "public, s-maxage=1, stale-while-revalidate=3",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = (body.sessionId || req.headers.get("x-session-id") || "").trim();

    // 1. Instant leave beacon (e.g. user closes tab)
    if (body.action === "leave") {
      if (sessionId) {
        await StatsService.recordLeave(sessionId);
      }
      return NextResponse.json({ success: true });
    }

    // 2. High-precision country detection:
    // Priority: Cloudflare/Vercel edge geo header -> reverse proxy -> request.geo -> client guess
    const rawCountryCode =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-country-code") ||
      req.headers.get("x-geo-country") ||
      (req as any).geo?.country ||
      body.countryCode ||
      null;

    const canonical = getCanonicalCountry(rawCountryCode);
    const isNewSession = Boolean(body.isNewSession ?? body.isInitialView);

    await StatsService.recordPing({
      sessionId: sessionId || "anonymous",
      countryCode: canonical?.code || undefined,
      countryName: canonical?.name || undefined,
      isNewSession,
    });

    const res = await StatsService.getLiveStats({ fresh: isNewSession });
    return NextResponse.json({ success: res.success, stats: res.data, error: res.error });
  } catch (err: any) {
    const res = await StatsService.getLiveStats();
    return NextResponse.json({ success: res.success, stats: res.data });
  }
}
