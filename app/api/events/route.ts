import { NextRequest } from "next/server";
import { db } from "@/lib/db/config/client";
import { floors, floorLocks } from "@/lib/db/config/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events (SSE) endpoint for real-time live synchronization
 * across all connected devices (mobile, tablet, desktop).
 * Compatible with Vercel Serverless (24s auto-reconnect cycle).
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isAlive = true;
      let lastClaimTime = 0;
      let lastLockState = "";

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", () => {
        isAlive = false;
      });

      // Initial connected heartbeat
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`)
      );

      // Get initial latest top floor claim timestamp
      try {
        const topFloors = await db
          .select({ claimedAt: floors.claimedAt })
          .from(floors)
          .where(eq(floors.rank, 1))
          .limit(1);

        if (topFloors.length > 0 && topFloors[0].claimedAt) {
          lastClaimTime = new Date(topFloors[0].claimedAt).getTime();
        }
      } catch (e) {
        lastClaimTime = Date.now();
      }

      // Active monitoring loop (runs for 24 seconds before clean serverless cycle)
      const startTime = Date.now();
      const maxStreamDurationMs = 24000;

      while (isAlive && Date.now() - startTime < maxStreamDurationMs) {
        try {
          // 1. Check for newly claimed top floor
          const topFloors = await db
            .select()
            .from(floors)
            .where(eq(floors.rank, 1))
            .limit(1);

          if (topFloors.length > 0 && topFloors[0].isClaimed && topFloors[0].claimedAt) {
            const claimTime = new Date(topFloors[0].claimedAt).getTime();
            if (claimTime > lastClaimTime) {
              lastClaimTime = claimTime;
              const top = topFloors[0];
              const eventPayload = {
                type: "floor-claimed",
                companyName: top.companyName,
                url: top.url,
                logoUrl: top.logoUrl,
                tagline: top.tagline,
                description: top.description,
                pricePaid: top.pricePaid,
                rank: top.rank,
                timestamp: claimTime,
              };
              controller.enqueue(
                encoder.encode(`event: floor-claimed\ndata: ${JSON.stringify(eventPayload)}\n\n`)
              );
            }
          }

          // 2. Check for lock changes
          const activeLocks = await db.select().from(floorLocks);
          const currentLockState = activeLocks
            .map((l) => `${l.targetRank}:${l.expiresAt?.toISOString()}`)
            .join(",");

          if (currentLockState !== lastLockState) {
            lastLockState = currentLockState;
            controller.enqueue(
              encoder.encode(
                `event: lock-updated\ndata: ${JSON.stringify({
                  locks: activeLocks,
                  timestamp: Date.now(),
                })}\n\n`
              )
            );
          }

          // Keep-alive heartbeat comment
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch (err) {
          // Ignore transient DB pool errors during stream
        }

        // Wait 1.8s between event checks
        await new Promise((resolve) => setTimeout(resolve, 1800));
      }

      // Gracefully close stream so browser EventSource auto-reconnects seamlessly
      if (isAlive) {
        try {
          controller.enqueue(encoder.encode(`event: cycle\ndata: {}\n\n`));
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
