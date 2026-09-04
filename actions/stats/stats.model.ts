import { db } from "@/lib/db/config/client";
import { siteStats, visitorCountries, sessions, floors } from "@/lib/db/config/schema";
import { eq, sql, gt, count, isNotNull, and, isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export interface LiveStatsData {
  online: number;
  heightFt: number;
  claimedFloors: number;
  totalFloors: number;
  totalViews: number;
  countriesCount: number;
}

export interface RecordVisitAndPingData {
  sessionId: string;
  countryCode: string | null;
  countryName: string | null;
  isNewSession: boolean;
}

export class StatsModel {
  /**
   * Fetch live skyscraper statistics directly from the database.
   */
  static async getLiveStats(): Promise<LiveStatsData> {
    const cachedStats = unstable_cache(
      async () => {
        try {
          const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
          const activeRes = await db
            .select({ count: count() })
            .from(sessions)
            .where(gt(sessions.lastSeenAt, twoMinutesAgo));

          const onlineCount = Math.max(1, Number(activeRes[0]?.count || 0));

          const claimedRes = await db
            .select({ count: count() })
            .from(floors);

          const claimedCount = Number(claimedRes[0]?.count || 0);

          const statsRes = await db
            .select()
            .from(siteStats)
            .where(eq(siteStats.key, "global"))
            .limit(1);

          const totalViews = Number(statsRes[0]?.totalViews || 0);

          const countriesRes = await db
            .select({ count: count(sql`DISTINCT ${visitorCountries.countryCode}`) })
            .from(visitorCountries)
            .where(isNotNull(visitorCountries.countryCode));

          const countriesCount = Math.max(1, Number(countriesRes[0]?.count || 0));

          return {
            online: onlineCount,
            heightFt: Math.max(731, claimedCount * 15),
            claimedFloors: claimedCount,
            totalFloors: claimedCount,
            totalViews,
            countriesCount,
          };
        } catch (err) {
          console.error("Error fetching live stats:", err);
          return {
            online: 1,
            heightFt: 731,
            claimedFloors: 0,
            totalFloors: 0,
            totalViews: 0,
            countriesCount: 1,
          };
        }
      },
      ["live-stats"],
      {
        tags: ["stats"],
        revalidate: 5,
      }
    );

    return await cachedStats();
  }

  /**
   * Record page visit or heartbeat ping.
   */
  static async recordVisitAndPing(data: RecordVisitAndPingData): Promise<void> {
    try {
      if (data.isNewSession) {
        await db
          .insert(siteStats)
          .values({
            key: "global",
            totalViews: 1,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: siteStats.key,
            set: {
              totalViews: sql`COALESCE(${siteStats.totalViews}, 0) + 1`,
              updatedAt: new Date(),
            },
          });
      }

      if (data.countryCode && data.countryCode.length <= 10) {
        await db
          .insert(visitorCountries)
          .values({
            countryCode: data.countryCode,
            countryName: data.countryName || data.countryCode,
            visitCount: 1,
            lastVisitedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: visitorCountries.countryCode,
            set: {
              visitCount: sql`${visitorCountries.visitCount} + 1`,
              lastVisitedAt: new Date(),
            },
          });
      }

      await db
        .insert(sessions)
        .values({
          sessionToken: data.sessionId,
          countryCode: data.countryCode,
          lastSeenAt: new Date(),
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: sessions.sessionToken,
          set: {
            lastSeenAt: new Date(),
            countryCode: data.countryCode || sessions.countryCode,
          },
        });

      // Prune anonymous visitor heartbeats older than 1 hour, without touching authenticated user sessions
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      await db
        .delete(sessions)
        .where(
          and(
            isNull(sessions.userId),
            sql`${sessions.lastSeenAt} < ${oneHourAgo}`
          )
        );
    } catch (err) {
      console.error("Failed to record visit/ping:", err);
    }
  }
}
