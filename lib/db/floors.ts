import { db } from "./config/client";
import { floors, claims, users, type Floor, type NewFloor } from "./config/schema";
import { eq, asc, and, gt, sql } from "drizzle-orm";
import crypto from "crypto";

export type { Floor, NewFloor };

export interface ClaimFloorInput {
  paymentId: string;
  checkoutSessionId?: string;
  companyName: string;
  url: string;
  category?: string;
  price: number;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  customerEmail?: string;
  customerPhone?: string;
  manageToken?: string;
}

export interface UpdateFloorInput {
  companyName?: string;
  url?: string;
  category?: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
}

/**
 * Fetch the 50 skyscraper floors sorted by rank (Rank 1 = Top Penthouse Floor).
 * If the database has not been seeded yet, seeds default 50 premium placeholder floors.
 */
export async function getActiveFloors(): Promise<Floor[]> {
  try {
    const list = await db
      .select()
      .from(floors)
      .orderBy(asc(floors.rank))
      .limit(50);

    if (list.length > 0) return list;
  } catch (err: any) {
    console.warn("Table floors might not exist or is empty, will auto-initialize:", err?.message);
  }

  // Auto-initialize if empty or table needs creation
  await initializeFloorsIfEmpty();
  return await db.select().from(floors).orderBy(asc(floors.rank)).limit(50);
}

/**
 * Ensures 50 premium placeholder floors exist using pure Drizzle.
 * Minimum starting price is ₹50.
 */
export async function initializeFloorsIfEmpty(): Promise<void> {
  try {
    const existing = await db.select().from(floors).limit(50);
    const count = existing.length;

    if (count < 50) {
      const placeholders: NewFloor[] = [];
      for (let rank = count + 1; rank <= 50; rank++) {
        const price = Math.max(50, 95 - (rank - 1));
        const title =
          rank === 1
            ? "Penthouse Floor #1 — Open for Claim"
            : rank === 2
            ? "Skyline Suite #2 — Open for Claim"
            : `Tower Floor #${rank} — Spot Reserved`;

        placeholders.push({
          rank,
          isClaimed: false,
          companyName: title,
          url: "https://getopfloor.com",
          category: "Available Floor",
          tagline: "Spot reserved for your startup — Outbid & claim top floor",
          description: "Claim this floor to put your company on the world stage.",
          pricePaid: price,
        });
      }

      if (placeholders.length > 0) {
        await db.insert(floors).values(placeholders).onConflictDoNothing();
      }
    }
  } catch (err) {
    console.error("Failed to initialize floors:", err);
  }
}

/**
 * High-reliability atomic transactional floor claim using pure Drizzle ORM:
 * When a user completes a payment:
 * 1. Checks payment idempotency.
 * 2. Shifts existing floor ranks down atomically (rank = rank + 1).
 * 3. Upserts user in 'users' table using Drizzle onConflictDoUpdate.
 * 4. Inserts newly claimed company at Rank 1 (Top Penthouse Floor).
 * 5. Trims floors beyond rank 50 using Drizzle delete.
 * 6. Updates claim ledger to 'succeeded'.
 */
export async function claimTopFloorTransactional(
  input: ClaimFloorInput
): Promise<{ success: boolean; rank: number; manageToken: string; message: string }> {
  await initializeFloorsIfEmpty();
  const token = input.manageToken || crypto.randomUUID().replace(/-/g, "");

  return await db.transaction(async (tx) => {
    // 1. Idempotency Check: if this payment was already processed, don't double shift
    const existingClaim = await tx
      .select()
      .from(claims)
      .where(
        sql`${claims.paymentId} = ${input.paymentId} OR (${input.checkoutSessionId ? sql`${claims.paymentId} = ${input.checkoutSessionId}` : sql`false`})`
      )
      .limit(1);

    if (existingClaim.length > 0 && existingClaim[0].status === "succeeded") {
      return {
        success: true,
        rank: 1,
        manageToken: existingClaim[0].manageToken || token,
        message: "Payment already successfully processed.",
      };
    }

    // 2. Atomic sequential shift using Drizzle update
    await tx.update(floors).set({ rank: sql`${floors.rank} * -1` });
    await tx.update(floors).set({ rank: sql`(${floors.rank} * -1) + 1` });

    // 3. Upsert user in 'users' table using pure Drizzle
    let userId: number | null = null;
    const cleanEmail = input.customerEmail?.toLowerCase().trim() || null;
    const cleanPhone = input.customerPhone?.trim() || null;

    if (cleanEmail) {
      const [upsertedUser] = await tx
        .insert(users)
        .values({
          email: cleanEmail,
          name: input.companyName || "Founder",
          phone: cleanPhone,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            ...(cleanPhone ? { phone: cleanPhone } : {}),
            updatedAt: new Date(),
          },
        })
        .returning({ id: users.id });

      userId = upsertedUser?.id ?? null;
    }

    // 4. Insert newly claimed startup at Rank 1 (Penthouse Floor) using pure Drizzle
    const finalPrice = Math.max(50, input.price);

    await tx.insert(floors).values({
      rank: 1,
      isClaimed: true,
      companyName: input.companyName,
      url: input.url,
      category: input.category || "Startup",
      tagline: input.tagline || `${input.companyName} — Official Skyscraper Floor`,
      description: input.description || `Claimed top floor at ₹${finalPrice}`,
      logoUrl: input.logoUrl || null,
      pricePaid: finalPrice,
      manageToken: token,
      ownerEmail: cleanEmail,
      userId: userId,
      claimedAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Prune floors beyond rank 50 to maintain exact 50 floors using pure Drizzle
    await tx.delete(floors).where(and(gt(floors.rank, 50), eq(floors.isClaimed, false)));
    await tx.delete(floors).where(gt(floors.rank, 50));

    // 6. Update claim ledger to succeeded using pure Drizzle
    await tx
      .insert(claims)
      .values({
        paymentId: input.paymentId,
        status: "succeeded",
        companyName: input.companyName,
        url: input.url,
        category: input.category || "Startup",
        amount: finalPrice,
        currency: "INR",
        customerEmail: cleanEmail || undefined,
        customerPhone: cleanPhone || undefined,
        userId: userId || undefined,
        manageToken: token,
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: claims.paymentId,
        set: {
          status: "succeeded",
          manageToken: token,
          customerPhone: cleanPhone || undefined,
          userId: userId || undefined,
          completedAt: new Date(),
        },
      });

    if (input.checkoutSessionId && input.checkoutSessionId !== input.paymentId) {
      await tx
        .update(claims)
        .set({
          status: "succeeded",
          manageToken: token,
          customerPhone: cleanPhone || undefined,
          userId: userId || undefined,
          completedAt: new Date(),
        })
        .where(eq(claims.paymentId, input.checkoutSessionId));
    }

    return {
      success: true,
      rank: 1,
      manageToken: token,
      message: `Successfully claimed Top Floor (Rank 1) for ${input.companyName}!`,
    };
  });
}

/**
 * Fetch all claimed floors owned by a verified email using pure Drizzle.
 */
export async function getFloorsByEmail(email: string): Promise<Floor[]> {
  if (!email?.trim()) return [];
  const cleanEmail = email.toLowerCase().trim();
  return await db
    .select()
    .from(floors)
    .where(and(eq(floors.ownerEmail, cleanEmail), eq(floors.isClaimed, true)))
    .orderBy(floors.rank);
}

/**
 * Update a floor owned by a verified email using pure Drizzle.
 */
export async function updateFloorByEmail(
  floorId: number,
  email: string,
  updates: UpdateFloorInput
): Promise<Floor | null> {
  const cleanEmail = email.toLowerCase().trim();
  const existing = await db
    .select()
    .from(floors)
    .where(and(eq(floors.id, floorId), eq(floors.ownerEmail, cleanEmail)))
    .limit(1);

  if (existing.length === 0) return null;

  const setPayload: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (updates.companyName?.trim()) setPayload.companyName = updates.companyName.trim();
  if (updates.url?.trim()) {
    let cleanUrl = updates.url.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = `https://${cleanUrl}`;
    setPayload.url = cleanUrl;
  }
  if (updates.category?.trim()) setPayload.category = updates.category.trim();
  if (updates.tagline?.trim()) setPayload.tagline = updates.tagline.trim();
  if (updates.description?.trim()) setPayload.description = updates.description.trim();
  if (updates.logoUrl !== undefined) setPayload.logoUrl = updates.logoUrl?.trim() || null;

  await db.update(floors).set(setPayload).where(eq(floors.id, floorId));

  const updated = await db.select().from(floors).where(eq(floors.id, floorId)).limit(1);
  return updated[0] || null;
}

/**
 * Vacate a floor owned by a verified email using pure Drizzle.
 */
export async function deleteFloorByEmail(
  floorId: number,
  email: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const existing = await db
    .select()
    .from(floors)
    .where(and(eq(floors.id, floorId), eq(floors.ownerEmail, cleanEmail)))
    .limit(1);

  if (existing.length === 0) {
    return { success: false, message: "Floor not found or you are not authorized to manage it." };
  }

  const current = existing[0];

  await db
    .update(floors)
    .set({
      isClaimed: false,
      companyName: `Tower Floor #${current.rank} — Spot Reserved`,
      url: "https://getopfloor.com",
      category: "Available Floor",
      tagline: "Spot reserved for your startup — Outbid & claim top floor",
      description: "Claim this floor to put your company on the world stage.",
      logoUrl: null,
      manageToken: null,
      ownerEmail: null,
      userId: null,
      claimedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(floors.id, floorId));

  return {
    success: true,
    message: `Floor #${current.rank} (${current.companyName}) has been vacated and reset to an available slot.`,
  };
}
