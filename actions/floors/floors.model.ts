import { db } from "@/lib/db/client";
import { floors, claims, users, type Floor, type NewFloor } from "@/lib/db/schema";
import { eq, asc, and, gt, sql } from "drizzle-orm";
import crypto from "crypto";
import { ClaimFloorInput, UpdateFloorInput } from "./floors.types";

export class FloorsModel {
  /**
   * Fetch all 50 skyscraper floors ordered by rank (Rank 1 = Penthouse Floor).
   */
  static async getActiveFloors(): Promise<Floor[]> {
    try {
      const list = await db
        .select()
        .from(floors)
        .orderBy(asc(floors.rank))
        .limit(50);

      if (list.length > 0) return list;
    } catch (err: any) {
      console.warn("Table floors might be empty or initializing:", err?.message);
    }

    await FloorsModel.initializeFloorsIfEmpty();
    return await db.select().from(floors).orderBy(asc(floors.rank)).limit(50);
  }

  /**
   * Ensure 50 premium placeholder floors exist in the database using pure Drizzle.
   */
  static async initializeFloorsIfEmpty(): Promise<void> {
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
   * Transactional atomic floor claim using type-safe Drizzle:
   * 1. Check idempotency.
   * 2. Shift ranks down.
   * 3. Upsert user.
   * 4. Insert startup at Rank 1.
   * 5. Trim floors beyond rank 50.
   * 6. Update claims ledger.
   */
  static async claimTopFloor(input: ClaimFloorInput) {
    await FloorsModel.initializeFloorsIfEmpty();
    const token = input.manageToken || crypto.randomUUID().replace(/-/g, "");

    return await db.transaction(async (tx) => {
      // 1. Idempotency Check
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

      // 4. Insert newly claimed company at Rank 1 using pure Drizzle
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

      // 5. Prune floors beyond rank 50 using pure Drizzle
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

      return {
        success: true,
        rank: 1,
        manageToken: token,
        message: `Successfully claimed Top Floor (Rank 1) for ${input.companyName}!`,
      };
    });
  }

  /**
   * Fetch floors owned by a verified email using pure Drizzle.
   */
  static async getFloorsByEmail(email: string): Promise<Floor[]> {
    if (!email?.trim()) return [];
    const cleanEmail = email.toLowerCase().trim();
    return await db
      .select()
      .from(floors)
      .where(and(eq(floors.ownerEmail, cleanEmail), eq(floors.isClaimed, true)))
      .orderBy(floors.rank);
  }

  /**
   * Update a floor using pure Drizzle.
   */
  static async updateFloor(floorId: number, email: string, updates: UpdateFloorInput): Promise<Floor | null> {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await db
      .select()
      .from(floors)
      .where(and(eq(floors.id, floorId), eq(floors.ownerEmail, cleanEmail)))
      .limit(1);

    if (existing.length === 0) return null;

    const setPayload: Record<string, any> = { updatedAt: new Date() };
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

    const [updated] = await db
      .update(floors)
      .set(setPayload)
      .where(eq(floors.id, floorId))
      .returning();

    return updated || null;
  }

  /**
   * Vacate a floor using pure Drizzle.
   */
  static async deleteFloor(floorId: number, email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await db
      .select()
      .from(floors)
      .where(and(eq(floors.id, floorId), eq(floors.ownerEmail, cleanEmail)))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, message: "Floor not found or not authorized." };
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
      message: `Floor #${current.rank} (${current.companyName}) has been vacated and reset.`,
    };
  }
}
