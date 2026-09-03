import { db } from "./config/client";
import { floors, claims, users, type Floor, type NewFloor } from "./config/schema";
import { eq, asc, and, gt, gte, lte, sql } from "drizzle-orm";
import { releaseFloorLock } from "./locks";
import crypto from "crypto";

export type { Floor, NewFloor };

export interface ClaimFloorInput {
  paymentId: string;
  checkoutSessionId?: string;
  companyName: string;
  url: string;
  category?: string;
  price: number;
  targetRank?: number;
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

import { scrapeWebsiteMetadata } from "@/lib/crawler/metadata";
import { verifyWebsiteLive } from "@/lib/validation/domain";
import { releaseTopFloorLock } from "./locks";

/**
 * Ensures 50 premium placeholder floors exist using pure Drizzle.
 * Minimum starting price is ₹50 for all open floors.
 */
export async function initializeFloorsIfEmpty(): Promise<void> {
  try {
    const existing = await db.select().from(floors).limit(50);
    const count = existing.length;

    if (count < 50) {
      const placeholders: NewFloor[] = [];
      for (let rank = count + 1; rank <= 50; rank++) {
        const price = 50 + (50 - rank); // Pricing ladder: Floor 50 = ₹50, Floor 1 = ₹99
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

export interface ClaimResult {
  success: boolean;
  rank: number;
  manageToken: string;
  message: string;
  companyName?: string;
  url?: string;
  logoUrl?: string | null;
  tagline?: string | null;
  description?: string | null;
}

/**
 * High-reliability atomic transactional floor claim using pure Drizzle ORM:
 * When a user completes a payment:
 * 1. Checks payment idempotency.
 * 2. Crawls/scrapes website metadata (name, tagline, description, logo) if not provided.
 * 3. Shifts existing floor ranks down atomically (rank = rank + 1).
 * 4. Upserts user in 'users' table using Drizzle onConflictDoUpdate.
 * 5. Inserts newly claimed company at Rank 1 (Top Penthouse Floor).
 * 6. Trims floors beyond rank 50 using Drizzle delete.
 * 7. Updates claim ledger to 'succeeded'.
 */
export async function claimTopFloorTransactional(
  input: ClaimFloorInput
): Promise<ClaimResult> {
  // 0. Live security & reachability check: Ensure the website is active and secure before claiming
  const verification = await verifyWebsiteLive(input.url);
  if (!verification.valid || !verification.cleanUrl) {
    throw new Error(verification.error || "Website is unreachable or insecure. Floor claim rejected.");
  }
  input.url = verification.cleanUrl;

  await initializeFloorsIfEmpty();
  const token = input.manageToken || crypto.randomUUID().replace(/-/g, "");

  // Auto-scrape metadata if logo/description/tagline not provided
  let finalCompanyName = input.companyName?.trim();
  let finalTagline = input.tagline?.trim();
  let finalDescription = input.description?.trim();
  let finalLogoUrl = input.logoUrl?.trim();
  let finalCategory = input.category?.trim() || "Startup";

  if (!finalLogoUrl || !finalDescription || !finalTagline || !finalCompanyName || finalCompanyName === "New Startup" || finalCompanyName === "Anonymous Startup") {
    try {
      const scraped = await scrapeWebsiteMetadata(input.url);
      if (!finalCompanyName || finalCompanyName === "New Startup" || finalCompanyName === "Anonymous Startup") {
        finalCompanyName = scraped.companyName;
      }
      if (!finalTagline) finalTagline = scraped.tagline;
      if (!finalDescription) finalDescription = scraped.description;
      if (!finalLogoUrl) finalLogoUrl = scraped.logoUrl;
      if (!finalCategory || finalCategory === "Startup") finalCategory = scraped.category;
    } catch (scrapeErr) {
      console.warn("Metadata auto-scrape error during transaction:", scrapeErr);
    }
  }

  if (!finalCompanyName) finalCompanyName = "Startup";
  if (!finalTagline) finalTagline = `${finalCompanyName} — Official Skyscraper Floor`;
  if (!finalDescription) finalDescription = `Claimed top floor on GeTopFloor skyscraper.`;

  const targetRank = Math.min(50, Math.max(1, input.targetRank || 1));

  const result = await db.transaction(async (tx) => {
    // 1. Idempotency Check: if this payment was already processed, don't double shift
    const existingClaim = await tx
      .select()
      .from(claims)
      .where(
        sql`${claims.paymentId} = ${input.paymentId} OR (${input.checkoutSessionId ? sql`${claims.paymentId} = ${input.checkoutSessionId}` : sql`false`})`
      )
      .limit(1);

    if (existingClaim.length > 0 && existingClaim[0].status === "succeeded") {
      await releaseFloorLock(targetRank, input.paymentId, input.checkoutSessionId);
      return {
        success: true,
        rank: targetRank,
        companyName: existingClaim[0].companyName || finalCompanyName,
        url: existingClaim[0].url || input.url,
        logoUrl: finalLogoUrl,
        tagline: finalTagline,
        description: finalDescription,
        manageToken: existingClaim[0].manageToken || token,
        message: "Payment already successfully processed.",
      };
    }

    // 2. Atomic sequential shift only for floors at or below targetRank
    await tx
      .update(floors)
      .set({ rank: sql`${floors.rank} * -1` })
      .where(gte(floors.rank, targetRank));

    await tx
      .update(floors)
      .set({ rank: sql`(${floors.rank} * -1) + 1` })
      .where(lte(floors.rank, -1 * targetRank));

    // 3. Upsert user in 'users' table using pure Drizzle
    let userId: string | null = null;
    const cleanEmail = input.customerEmail?.toLowerCase().trim() || null;
    const cleanPhone = input.customerPhone?.trim() || null;

    if (cleanEmail) {
      const [upsertedUser] = await tx
        .insert(users)
        .values({
          email: cleanEmail,
          name: finalCompanyName || "Founder",
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

    // 4. Insert newly claimed startup at targetRank
    const finalPrice = Math.max(50, input.price);

    await tx.insert(floors).values({
      rank: targetRank,
      isClaimed: true,
      companyName: finalCompanyName,
      url: input.url,
      category: finalCategory,
      tagline: finalTagline,
      description: finalDescription,
      logoUrl: finalLogoUrl || null,
      pricePaid: finalPrice,
      manageToken: token,
      ownerEmail: cleanEmail,
      userId: userId,
      claimedAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Prune floors beyond rank 50 to maintain exact 50 floors
    await tx.delete(floors).where(and(gt(floors.rank, 50), eq(floors.isClaimed, false)));
    await tx.delete(floors).where(gt(floors.rank, 50));

    // 6. Update unclaimed placeholder titles and prices so they always match their new rank
    await tx
      .update(floors)
      .set({
        companyName: sql`CASE WHEN ${floors.rank} = 1 THEN 'Penthouse Floor #1 — Open for Claim' WHEN ${floors.rank} = 2 THEN 'Skyline Suite #2 — Open for Claim' ELSE 'Tower Floor #' || ${floors.rank} || ' — Spot Reserved' END`,
        pricePaid: sql`50 + (50 - ${floors.rank})`,
      })
      .where(eq(floors.isClaimed, false));

    // 7. Update claim ledger to succeeded using pure Drizzle
    await tx
      .insert(claims)
      .values({
        paymentId: input.paymentId,
        status: "succeeded",
        companyName: input.companyName,
        url: input.url,
        category: input.category || "Startup",
        amount: finalPrice,
        targetRank,
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
          targetRank,
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
          targetRank,
          customerPhone: cleanPhone || undefined,
          userId: userId || undefined,
          completedAt: new Date(),
        })
        .where(eq(claims.paymentId, input.checkoutSessionId));
    }

    return {
      success: true,
      rank: targetRank,
      companyName: finalCompanyName,
      url: input.url,
      logoUrl: finalLogoUrl,
      tagline: finalTagline,
      description: finalDescription,
      manageToken: token,
      message: `Successfully claimed Floor #${targetRank} for ${finalCompanyName}!`,
    };
  });

  // Release lock after transaction completes
  await releaseFloorLock(targetRank, input.paymentId, input.checkoutSessionId);

  return result;
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
  floorId: string,
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
  floorId: string,
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
