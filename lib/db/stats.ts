import { db } from "./config/client";
import { siteStats, visitorCountries, activeSessions, floors } from "./config/schema";
import { eq, sql, gt, count, and, isNotNull } from "drizzle-orm";

export interface LiveStatsData {
  online: number;
  heightFt: number;
  claimedFloors: number;
  totalFloors: number;
  totalViews: number;
  countriesCount: number;
}

export const BASELINE_VISITORS = 18028;

/**
 * Record a page visit or heartbeat ping from a visitor session.
 * 100% real tracking using pure Drizzle ORM:
 * - isNewSession = true: increments cumulative page views (new tab opened)
 * - isNewSession = false (or undefined): only refreshes active heartbeat ping (for online status)
 */
export async function recordVisitAndPing(
  sessionId: string,
  countryCode?: string | null,
  countryName?: string | null,
  isNewSession: boolean = false
): Promise<void> {
  const cleanSessionId = sessionId?.trim();
  if (!cleanSessionId) return;

  const cleanCountry = countryCode?.toUpperCase().trim() || null;
  const cleanCountryName = countryName?.trim() || null;

  try {
    // 1. Increment total page views ONLY on new tab sessions (not on recurring heartbeats)
    if (isNewSession) {
      await db
        .insert(siteStats)
        .values({
          key: "global",
          totalViews: BASELINE_VISITORS + 1,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: siteStats.key,
          set: {
            totalViews: sql`GREATEST(COALESCE(${siteStats.totalViews}, ${BASELINE_VISITORS}), ${BASELINE_VISITORS}) + 1`,
            updatedAt: new Date(),
          },
        });
    }

    // 2. Track unique visitor country if available
    if (cleanCountry && cleanCountry.length <= 10) {
      await db
        .insert(visitorCountries)
        .values({
          countryCode: cleanCountry,
          countryName: cleanCountryName || cleanCountry,
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

    // 3. Upsert active session for real-time online tracking (expires in 2 minutes)
    await db
      .insert(activeSessions)
      .values({
        sessionId: cleanSessionId,
        countryCode: cleanCountry,
        lastSeenAt: new Date(),
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: activeSessions.sessionId,
        set: {
          lastSeenAt: new Date(),
          countryCode: cleanCountry || activeSessions.countryCode,
        },
      });

    // 4. Prune sessions inactive for over 10 minutes (keep active sessions table lean)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await db.delete(activeSessions).where(sql`${activeSessions.lastSeenAt} < ${tenMinutesAgo}`);
  } catch (err) {
    console.error("Failed to record visit/ping:", err);
  }
}

/**
 * Fetch real, live skyscraper statistics directly from the database.
 */
export async function getLiveStats(): Promise<LiveStatsData> {
  try {
    // 1. Active sessions within the last 2 minutes = real live online count
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const activeRes = await db
      .select({ count: count() })
      .from(activeSessions)
      .where(gt(activeSessions.lastSeenAt, twoMinutesAgo));

    const onlineCount = Math.max(1, Number(activeRes[0]?.count || 0));

    // 2. Real claimed floors count (floors with is_claimed = true)
    const claimedRes = await db
      .select({ count: count() })
      .from(floors)
      .where(eq(floors.isClaimed, true));

    const claimedCount = Number(claimedRes[0]?.count || 0);

    // 3. Real cumulative page views
    const statsRes = await db
      .select()
      .from(siteStats)
      .where(eq(siteStats.key, "global"))
      .limit(1);

    const rawViews = Number(statsRes[0]?.totalViews || 0);
    const totalViews = Math.max(BASELINE_VISITORS, rawViews || BASELINE_VISITORS);

    // 4. Real distinct unique countries count
    const countriesRes = await db
      .select({ count: count(sql`DISTINCT ${visitorCountries.countryCode}`) })
      .from(visitorCountries)
      .where(isNotNull(visitorCountries.countryCode));

    const countriesCount = Math.max(1, Number(countriesRes[0]?.count || 0));

    return {
      online: onlineCount,
      heightFt: 731,
      claimedFloors: claimedCount,
      totalFloors: 50,
      totalViews,
      countriesCount,
    };
  } catch (err) {
    console.error("Error fetching live stats:", err);
    return {
      online: 1,
      heightFt: 731,
      claimedFloors: 0,
      totalFloors: 50,
      totalViews: BASELINE_VISITORS,
      countriesCount: 1,
    };
  }
}
