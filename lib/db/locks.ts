import { db } from "./config/client";
import { floorLocks } from "./config/schema";
import { eq, sql } from "drizzle-orm";

export interface LockStatus {
  isLocked: boolean;
  targetRank?: number;
  lockedByEmail?: string | null;
  lockedByPaymentId?: string | null;
  companyName?: string | null;
  expiresAt?: string | null;
  secondsRemaining?: number;
}

/**
 * Ensures table exists in database
 */
export async function ensureFloorLocksTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS floor_locks (
        target_rank INTEGER PRIMARY KEY DEFAULT 1,
        locked_by_email VARCHAR(255),
        locked_by_payment_id VARCHAR(255),
        company_name VARCHAR(255),
        locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
  } catch (err) {
    console.warn("Could not ensure floor_locks table:", err);
  }
}

/**
 * Get claim lock status for a specific floor rank.
 */
export async function getFloorLock(targetRank = 1): Promise<LockStatus> {
  try {
    const rows = await db
      .select()
      .from(floorLocks)
      .where(eq(floorLocks.targetRank, targetRank))
      .limit(1);

    if (rows.length === 0) {
      return { isLocked: false, targetRank };
    }

    const lock = rows[0];
    const now = new Date();

    if (new Date(lock.expiresAt) > now) {
      const secondsRemaining = Math.max(
        0,
        Math.round((new Date(lock.expiresAt).getTime() - now.getTime()) / 1000)
      );

      return {
        isLocked: true,
        targetRank: lock.targetRank,
        lockedByEmail: lock.lockedByEmail,
        lockedByPaymentId: lock.lockedByPaymentId,
        companyName: lock.companyName,
        expiresAt: lock.expiresAt.toISOString(),
        secondsRemaining,
      };
    }

    // Expired: purge
    db.delete(floorLocks)
      .where(eq(floorLocks.targetRank, targetRank))
      .catch((e) => console.warn("Failed to delete expired lock:", e));

    return { isLocked: false, targetRank };
  } catch (err: any) {
    await ensureFloorLocksTable();
    return { isLocked: false, targetRank };
  }
}

export const getTopFloorLock = (rank = 1) => getFloorLock(rank);

/**
 * Get all active claim locks across all floors (Ranks 1..50).
 * Automatically purges expired locks.
 */
export async function getAllFloorLocks(): Promise<Record<number, LockStatus>> {
  try {
    await ensureFloorLocksTable();
    const now = new Date();
    const rows = await db.select().from(floorLocks);
    const lockMap: Record<number, LockStatus> = {};
    const expiredRanks: number[] = [];

    for (const lock of rows) {
      if (new Date(lock.expiresAt) > now) {
        const secondsRemaining = Math.max(
          0,
          Math.round((new Date(lock.expiresAt).getTime() - now.getTime()) / 1000)
        );

        lockMap[lock.targetRank] = {
          isLocked: true,
          targetRank: lock.targetRank,
          lockedByEmail: lock.lockedByEmail,
          lockedByPaymentId: lock.lockedByPaymentId,
          companyName: lock.companyName,
          expiresAt: lock.expiresAt.toISOString(),
          secondsRemaining,
        };
      } else {
        expiredRanks.push(lock.targetRank);
      }
    }

    // Purge expired locks in background
    if (expiredRanks.length > 0) {
      db.delete(floorLocks)
        .where(sql`${floorLocks.targetRank} IN (${sql.join(expiredRanks, sql`, `)})`)
        .catch((e) => console.warn("Failed to purge expired locks:", e));
    }

    return lockMap;
  } catch (err) {
    console.warn("Error fetching all floor locks:", err);
    return {};
  }
}

/**
 * Acquire claim lock for any specific floor rank.
 * Default duration: 5 minutes (300 seconds).
 */
export async function acquireFloorLock({
  targetRank = 1,
  email,
  paymentId,
  companyName,
  durationSeconds = 300,
}: {
  targetRank?: number;
  email?: string | null;
  paymentId?: string | null;
  companyName?: string | null;
  durationSeconds?: number;
}): Promise<{ success: boolean; isLocked?: boolean; message?: string; secondsRemaining?: number }> {
  await ensureFloorLocksTable();
  const currentLock = await getFloorLock(targetRank);
  const cleanEmail = email?.toLowerCase().trim() || null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationSeconds * 1000);

  // If locked by someone else, reject acquisition
  if (currentLock.isLocked) {
    const isSameUser =
      (cleanEmail && currentLock.lockedByEmail && cleanEmail === currentLock.lockedByEmail.toLowerCase().trim()) ||
      (paymentId && currentLock.lockedByPaymentId && paymentId === currentLock.lockedByPaymentId);

    if (!isSameUser) {
      const floorLabel = targetRank === 1 ? "Top Floor (#1)" : `Floor #${targetRank}`;
      return {
        success: false,
        isLocked: true,
        secondsRemaining: currentLock.secondsRemaining,
        message: `Someone is currently claiming ${floorLabel}. Please wait a moment until their transaction finishes or expires.`,
      };
    }
  }

  // Upsert lock
  try {
    await db
      .insert(floorLocks)
      .values({
        targetRank,
        lockedByEmail: cleanEmail,
        lockedByPaymentId: paymentId || null,
        companyName: companyName || "A founder",
        lockedAt: now,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: floorLocks.targetRank,
        set: {
          lockedByEmail: cleanEmail,
          lockedByPaymentId: paymentId || null,
          companyName: companyName || "A founder",
          lockedAt: now,
          expiresAt,
        },
      });

    return { success: true };
  } catch (err: any) {
    console.error(`Failed to acquire lock on floor #${targetRank}:`, err);
    return { success: false, message: "Could not acquire claim lock. Please try again." };
  }
}

export const acquireTopFloorLock = (args: Parameters<typeof acquireFloorLock>[0]) => acquireFloorLock(args);

/**
 * Release claim lock for a specific floor rank.
 * If paymentId / checkoutSessionId is provided, matches against either.
 * If neither is provided, releases the lock on that rank unconditionally.
 */
export async function releaseFloorLock(
  targetRank = 1,
  paymentId?: string | null,
  checkoutSessionId?: string | null
): Promise<void> {
  try {
    await ensureFloorLocksTable();
    if (paymentId || checkoutSessionId) {
      await db
        .delete(floorLocks)
        .where(
          sql`${floorLocks.targetRank} = ${targetRank} AND (${paymentId ? sql`${floorLocks.lockedByPaymentId} = ${paymentId}` : sql`false`} OR ${checkoutSessionId ? sql`${floorLocks.lockedByPaymentId} = ${checkoutSessionId}` : sql`false`} OR ${floorLocks.lockedByPaymentId} IS NULL)`
        );
    } else {
      await db.delete(floorLocks).where(eq(floorLocks.targetRank, targetRank));
    }
  } catch (err) {
    console.warn(`Error releasing floor lock on rank #${targetRank}:`, err);
  }
}

export const releaseTopFloorLock = (targetRank = 1, paymentId?: string | null, checkoutSessionId?: string | null) =>
  releaseFloorLock(targetRank, paymentId, checkoutSessionId);
