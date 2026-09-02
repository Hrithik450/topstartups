import { db } from "./client";
import { floors, claims, type Floor } from "./schema";
import { eq, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import crypto from "crypto";

export interface ClaimFloorInput {
  paymentId: string;
  companyName: string;
  url: string;
  category?: string;
  price: number;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  customerEmail?: string;
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
    const list = await db.select().from(floors).orderBy(asc(floors.rank)).limit(50);
    if (list.length > 0) {
      return list;
    }
  } catch (err: any) {
    console.warn("Table floors might not exist or empty, will auto-initialize:", err?.message);
  }

  // Auto-initialize if empty or table needs creation
  await initializeFloorsIfEmpty();
  return await db.select().from(floors).orderBy(asc(floors.rank)).limit(50);
}

/**
 * Ensures floors table and 50 premium placeholder floors exist.
 * Minimum starting price is ₹50 (not ₹1).
 */
export async function initializeFloorsIfEmpty() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS floors (
        id SERIAL PRIMARY KEY,
        rank INTEGER NOT NULL,
        is_claimed BOOLEAN NOT NULL DEFAULT false,
        company_name VARCHAR(255) NOT NULL,
        url VARCHAR(512) NOT NULL,
        category VARCHAR(128),
        tagline TEXT,
        description TEXT,
        logo_url TEXT,
        price_paid INTEGER NOT NULL DEFAULT 50,
        manage_token VARCHAR(128),
        claimed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS floors_rank_unique_idx ON floors (rank);
      CREATE INDEX IF NOT EXISTS floors_is_claimed_idx ON floors (is_claimed);
      CREATE INDEX IF NOT EXISTS floors_manage_token_idx ON floors (manage_token);

      CREATE TABLE IF NOT EXISTS claims (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(64) NOT NULL DEFAULT 'pending',
        company_name VARCHAR(255) NOT NULL,
        url VARCHAR(512) NOT NULL,
        category VARCHAR(128),
        amount INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        customer_email VARCHAR(255),
        manage_token VARCHAR(128),
        checkout_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Ensure manage_token column exists in case table was created earlier
    await db.execute(sql`
      ALTER TABLE floors ADD COLUMN IF NOT EXISTS manage_token VARCHAR(128);
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS manage_token VARCHAR(128);
    `);

    const countRes: any = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM floors`);
    const count = Number(countRes.rows?.[0]?.cnt || 0);

    if (count < 50) {
      for (let rank = count + 1; rank <= 50; rank++) {
        // Minimum amount starts from 50 INR!
        const price = Math.max(50, 95 - (rank - 1));
        const title =
          rank === 1
            ? "Penthouse Floor #1 — Open for Claim"
            : rank === 2
            ? "Skyline Suite #2 — Open for Claim"
            : `Tower Floor #${rank} — Spot Reserved`;

        await db.execute(sql`
          INSERT INTO floors (rank, is_claimed, company_name, url, category, tagline, description, price_paid)
          VALUES (
            ${rank},
            false,
            ${title},
            'https://getopfloor.com',
            'Available Floor',
            'Spot reserved for your startup — Outbid & claim top floor',
            'Claim this floor to put your company on the world stage.',
            ${price}
          )
          ON CONFLICT DO NOTHING
        `);
      }
    }
  } catch (err) {
    console.error("Failed to initialize floors:", err);
  }
}

/**
 * High-reliability atomic transactional floor claim:
 * When a user completes a payment:
 * 1. Checks payment idempotency.
 * 2. Generates a secure manage_token.
 * 3. Shifts existing floor ranks down atomically (rank = rank + 1).
 * 4. Places the newly claimed company at Rank 1 (Top Penthouse Floor).
 * 5. Trims lowest placeholder so tower cleanly maintains active 50 floors.
 * 6. Marks claim status as 'succeeded' and returns manageToken.
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
      .where(eq(claims.paymentId, input.paymentId))
      .limit(1);

    if (existingClaim.length > 0 && existingClaim[0].status === "succeeded") {
      return {
        success: true,
        rank: 1,
        manageToken: existingClaim[0].manageToken || token,
        message: "Payment already successfully processed.",
      };
    }

    // 2. Atomic sequential shift:
    // To avoid temporary unique index violation on rank, shift to negative, then positive + 1
    await tx.execute(sql`UPDATE floors SET rank = -rank`);
    await tx.execute(sql`UPDATE floors SET rank = (-rank) + 1`);

    // 3. Insert the newly claimed startup at Rank 1 (Penthouse Floor)
    // Enforce minimum price of 50 INR
    const finalPrice = Math.max(50, input.price);

    await tx.execute(sql`
      INSERT INTO floors (
        rank,
        is_claimed,
        company_name,
        url,
        category,
        tagline,
        description,
        logo_url,
        price_paid,
        manage_token,
        owner_email,
        claimed_at,
        created_at,
        updated_at
      ) VALUES (
        1,
        true,
        ${input.companyName},
        ${input.url},
        ${input.category || "Startup"},
        ${input.tagline || `${input.companyName} — Official Skyscraper Floor`},
        ${input.description || `Claimed top floor at ₹${finalPrice}`},
        ${input.logoUrl || null},
        ${finalPrice},
        ${token},
        ${input.customerEmail?.toLowerCase().trim() || null},
        NOW(),
        NOW(),
        NOW()
      )
    `);

    // 4. Prune floors beyond rank 50 to maintain 50 floors
    await tx.execute(sql`DELETE FROM floors WHERE rank > 50 AND is_claimed = false`);
    await tx.execute(sql`DELETE FROM floors WHERE rank > 50`);

    // 5. Update claim ledger to succeeded
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
        customerEmail: input.customerEmail,
        manageToken: token,
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: claims.paymentId,
        set: {
          status: "succeeded",
          manageToken: token,
          completedAt: new Date(),
        },
      });

    return {
      success: true,
      rank: 1,
      manageToken: token,
      message: `Successfully claimed Top Floor (Rank 1) for ${input.companyName}!`,
    };
  });
}



/**
 * Fetch all claimed floors owned by a verified email.
 */
export async function getFloorsByEmail(email: string) {
  if (!email?.trim()) return [];
  const cleanEmail = email.toLowerCase().trim();
  return await db
    .select()
    .from(floors)
    .where(sql`LOWER(${floors.ownerEmail}) = ${cleanEmail} AND ${floors.isClaimed} = true`)
    .orderBy(floors.rank);
}

/**
 * Update a floor owned by a verified email.
 */
export async function updateFloorByEmail(
  floorId: number,
  email: string,
  updates: {
    companyName?: string;
    url?: string;
    category?: string;
    tagline?: string;
    description?: string;
    logoUrl?: string;
  }
) {
  const cleanEmail = email.toLowerCase().trim();
  const existing = await db
    .select()
    .from(floors)
    .where(sql`${floors.id} = ${floorId} AND LOWER(${floors.ownerEmail}) = ${cleanEmail}`)
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
 * Vacate a floor owned by a verified email.
 */
export async function deleteFloorByEmail(floorId: number, email: string) {
  const cleanEmail = email.toLowerCase().trim();
  const existing = await db
    .select()
    .from(floors)
    .where(sql`${floors.id} = ${floorId} AND LOWER(${floors.ownerEmail}) = ${cleanEmail}`)
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
      claimedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(floors.id, floorId));

  return {
    success: true,
    message: `Floor #${current.rank} (${current.companyName}) has been vacated and reset to an available slot.`,
  };
}

