import { db } from "@/lib/db/config/client";
import { siteStats, visitorCountries, sessions } from "@/lib/db/config/schema";
import { eq, sql } from "drizzle-orm";
import {
  calculateTowerHeightFt,
  getCanonicalCountry,
  type LiveStatsData,
} from "@/lib/stats";

export type { LiveStatsData };

export interface RecordVisitAndPingData {
  sessionId: string;
  countryCode: string | null;
  countryName: string | null;
  isNewSession: boolean;
}

export class StatsModel {
  // Ultra-fast in-memory cache to absorb high-traffic read bursts (3s TTL)
  private static memoryCache: { data: LiveStatsData; expiresAt: number } | null = null;

  static invalidateCache(): void {
    StatsModel.memoryCache = null;
  }

  /**
   * Fetch live skyscraper statistics using a single unified atomic query.
   */
  static async getLiveStats(options?: { fresh?: boolean }): Promise<LiveStatsData> {
    const now = Date.now();
    if (!options?.fresh && StatsModel.memoryCache && now < StatsModel.memoryCache.expiresAt) {
      return StatsModel.memoryCache.data;
    }

    try {
      const twoMinutesAgo = new Date(now - 2 * 60 * 1000);

      // Single roundtrip to PostgreSQL aggregating all platform metrics atomically
      const result = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM sessions WHERE last_seen_at > ${twoMinutesAgo}) AS online_count,
          (SELECT COUNT(*)::int FROM floors) AS claimed_count,
          (SELECT COALESCE(SUM(price_paid), 0)::int FROM floors) AS total_sales,
          (SELECT COALESCE(total_views, 0)::int FROM site_stats WHERE key = 'global') AS total_views,
          (SELECT COUNT(DISTINCT country_code)::int FROM visitor_countries WHERE country_code IS NOT NULL) AS countries_count
      `);

      const row = result.rows[0] as any;
      const claimedCount = Number(row?.claimed_count || 0);

      const stats: LiveStatsData = {
        online: Math.max(1, Number(row?.online_count || 0)),
        heightFt: calculateTowerHeightFt(claimedCount),
        claimedFloors: claimedCount,
        totalFloors: claimedCount,
        totalViews: Math.max(0, Number(row?.total_views || 0)),
        countriesCount: Math.max(1, Number(row?.countries_count || 0)),
        totalSales: Math.max(0, Number(row?.total_sales || 0)),
      };

      StatsModel.memoryCache = {
        data: stats,
        expiresAt: now + 3000,
      };

      return stats;
    } catch (err) {
      console.error("Error fetching live stats:", err);
      return (
        StatsModel.memoryCache?.data || {
          online: 1,
          heightFt: calculateTowerHeightFt(0),
          claimedFloors: 0,
          totalFloors: 0,
          totalViews: 0,
          countriesCount: 1,
          totalSales: 0,
        }
      );
    }
  }

  /**
   * Record page visit or heartbeat ping.
   */
  static async recordVisitAndPing(data: RecordVisitAndPingData): Promise<void> {
    try {
      const now = new Date();

      // 1. Increment totalViews ONLY when a new visitor session is detected
      if (data.isNewSession) {
        await db
          .insert(siteStats)
          .values({
            key: "global",
            totalViews: 1,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: siteStats.key,
            set: {
              totalViews: sql`COALESCE(${siteStats.totalViews}, 0) + 1`,
              updatedAt: now,
            },
          });

        StatsModel.invalidateCache();
      }

      // 2. Canonicalize country code & name via Intl.DisplayNames
      const canonical = getCanonicalCountry(data.countryCode);
      if (canonical) {
        if (data.isNewSession) {
          // Increment visitCount strictly for new session visits
          await db
            .insert(visitorCountries)
            .values({
              countryCode: canonical.code,
              countryName: canonical.name,
              visitCount: 1,
              lastVisitedAt: now,
            })
            .onConflictDoUpdate({
              target: visitorCountries.countryCode,
              set: {
                countryName: canonical.name,
                visitCount: sql`${visitorCountries.visitCount} + 1`,
                lastVisitedAt: now,
              },
            });

          StatsModel.invalidateCache();
        } else {
          // Heartbeat only: refresh lastVisitedAt and guarantee canonical name without bumping visitCount
          await db
            .insert(visitorCountries)
            .values({
              countryCode: canonical.code,
              countryName: canonical.name,
              visitCount: 1,
              lastVisitedAt: now,
            })
            .onConflictDoUpdate({
              target: visitorCountries.countryCode,
              set: {
                countryName: canonical.name,
                lastVisitedAt: now,
              },
            });
        }
      }

      // 3. Update session heartbeat
      if (data.sessionId && data.sessionId !== "anonymous") {
        await db
          .insert(sessions)
          .values({
            sessionToken: data.sessionId,
            countryCode: canonical?.code || null,
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lastSeenAt: now,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: sessions.sessionToken,
            set: {
              lastSeenAt: now,
              countryCode: canonical?.code || sessions.countryCode,
              expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
      }

      // 4. Background non-blocking session cleanup (~1 in 50 heartbeats)
      if (Math.random() < 0.02) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        db.delete(sessions)
          .where(sql`${sessions.lastSeenAt} < ${oneHourAgo}`)
          .catch((err) => console.warn("Background sessions prune error:", err));
      }
    } catch (err) {
      console.error("Failed to record visit/ping:", err);
    }
  }

  /**
   * Immediately remove session on visitor tab close (pagehide / unload beacon)
   */
  static async recordLeave(sessionId: string): Promise<void> {
    try {
      if (!sessionId || sessionId === "anonymous") return;
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionId));
      StatsModel.invalidateCache();
    } catch (err) {
      console.warn("Failed to record visitor leave:", err);
    }
  }
}
