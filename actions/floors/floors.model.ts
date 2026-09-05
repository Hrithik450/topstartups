import { db } from "@/lib/db/config/client";
import { unstable_cache } from "next/cache";
import { eq, and, sql, or } from "drizzle-orm";
import { extractRootHostname } from "@/lib/validation/domain";
import { floors, claims, type Floor, type NewFloor } from "@/lib/db/config/schema";

export interface ClaimFloorPreparedInput {
  paymentId?: string | null;
  checkoutSessionId: string;
  companyName?: string | null;
  companyUrl: string;
  category?: string | null;
  price: number;
  tagline?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

export interface ClaimResultModelResponse {
  success: boolean;
  rank?: number;
  id?: string;
  message?: string;
  companyName?: string;
  companyUrl?: string;
  logoUrl?: string | null;
  tagline?: string | null;
  description?: string | null;
  pricePaid?: number;
  isUpdate?: boolean;
  floor?: Floor;
  error?: string;
}

/**
 * Strip sensitive PII (like userEmail) before returning floor records to public endpoints
 */
export function toPublicFloor<T extends Record<string, any>>(floor: T): T {
  if (!floor) return floor;
  const { userEmail, ...safe } = floor;
  return safe as T;
}

/**
 * Module-level cached fetcher for active floors.
 * Cached in memory / data-cache across requests with 0ms database overhead.
 * Invalidated on-demand the exact millisecond revalidateTag("floors") is called.
 * SECURITY: Strips userEmail from all cached public records.
 */
const getCachedActiveFloors = unstable_cache(
  async (): Promise<Floor[]> => {
    try {
      const result = await db.query.floors.findMany({
        orderBy: (f, { desc, asc }) => [desc(f.pricePaid), asc(f.claimedAt)],
      });
      return result.map((floor: any, idx) => {
        const companyUrl = floor.companyUrl || "";
        const companyName = (
          floor.companyName ||
          (companyUrl ? extractRootHostname(companyUrl) : `Floor #${idx + 1}`)
        ).toLowerCase();
        const { userEmail, ...publicData } = floor;
        return {
          ...publicData,
          companyName,
          companyUrl,
          rank: idx + 1,
        };
      });
    } catch (err: any) {
      console.warn("Error fetching active claimed floors:", err?.message);
      return [];
    }
  },
  ["active-claimed-floors-cache-key"],
  {
    tags: ["floors"],
  }
);

export class FloorsModel {
  /**
   * Fetch active claimed skyscraper floors sorted by pricePaid DESC, claimedAt ASC.
   * Uses module-level on-demand cache (0ms latency, purged via revalidateTag("floors")).
   */
  static async getActiveFloors(): Promise<Floor[]> {
    return await getCachedActiveFloors();
  }

  /**
   * Fetch a single floor by ID.
   */
  static async getFloorById(id: string): Promise<Floor | null> {
    try {
      const active = await FloorsModel.getActiveFloors();
      const activeFloor = active.find((f) => f.id === id);
      if (activeFloor) return activeFloor;

      const floor = await db.query.floors.findFirst({
        where: (f, { eq }) => eq(f.id, id),
      });
      return floor ? toPublicFloor(floor) : null;
    } catch (err: any) {
      console.warn("Error fetching floor by id:", err?.message);
      return null;
    }
  }

  /**
   * Fetch a single floor by derived rank.
   */
  static async getFloorByRank(rank: number): Promise<Floor | null> {
    const active = await FloorsModel.getActiveFloors();
    return active[rank - 1] || null;
  }

  /**
   * Get the current highest floor price and calculate the required price for Top Floor (#1).
   * Runs a direct single-row query: ORDER BY price_paid DESC, claimed_at ASC LIMIT 1
   */
  static async getTopFloorPrice(): Promise<{ maxPrice: number; topFloorPrice: number }> {
    const topFloor = await db.query.floors.findFirst({
      orderBy: (f, { desc, asc }) => [desc(f.pricePaid), asc(f.claimedAt)],
      columns: {
        pricePaid: true,
      },
    });

    const maxPrice = Number(topFloor?.pricePaid || 0);
    const topFloorPrice = maxPrice > 0 ? maxPrice + 1 : 99;
    return { maxPrice, topFloorPrice };
  }

  /**
   * Find an existing floor on the skyscraper by host / domain.
   * Uses targeted SQL ILIKE filter (never full table scan).
   */
  static async findFloorByHost(cleanHost: string): Promise<Floor | null> {
    try {
      const candidates = await db
        .select()
        .from(floors)
        .where(
          or(
            sql`${floors.companyUrl} ILIKE ${"%" + cleanHost + "%"}`,
            sql`${floors.companyName} ILIKE ${"%" + cleanHost + "%"}`
          )
        )
        .limit(10);

      const found = candidates.find(
        (f) =>
          extractRootHostname(f.companyUrl || "") === cleanHost ||
          f.companyName?.toLowerCase() === cleanHost.toLowerCase()
      );
      return found ? toPublicFloor(found) : null;
    } catch (err) {
      console.warn("Error finding floor by host:", err);
      return null;
    }
  }

  /**
   * Fetch all claimed floors owned by a founder email or user ID.
   */
  static async getFloorsByEmail(email: string): Promise<Floor[]> {
    try {
      const active = await FloorsModel.getActiveFloors();
      const result = await db.query.floors.findMany({
        where: (f, { eq }) => eq(f.userEmail, email),
        orderBy: (f, { desc, asc }) => [desc(f.pricePaid), asc(f.claimedAt)],
      });

      return result.map((f) => {
        const activeMatch = active.find((a) => a.id === f.id);
        return activeMatch ? activeMatch : toPublicFloor(f);
      });
    } catch (err: any) {
      console.warn("Error fetching floors by email:", err?.message);
      return [];
    }
  }

  /**
   * Update a floor record in the database.
   * SECURITY: Strictly requires authenticated founder email matching the floor record.
   */
  static async updateFloor(
    floorId: string,
    email: string,
    payload: Partial<NewFloor> = {}
  ): Promise<Floor | null> {
    if (!floorId?.trim() || !email?.trim()) return null;
    const cleanEmail = email.toLowerCase().trim();

    const existing = await db
      .select()
      .from(floors)
      .where(and(eq(floors.id, floorId.trim()), eq(floors.userEmail, cleanEmail)))
      .limit(1);

    if (existing.length === 0) return null;

    await db
      .update(floors)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(and(eq(floors.id, floorId.trim()), eq(floors.userEmail, cleanEmail)));

    const updated = await db
      .select()
      .from(floors)
      .where(eq(floors.id, floorId.trim()))
      .limit(1);

    return updated[0] ? toPublicFloor(updated[0]) : null;
  }

  /**
   * Vacate a floor in the database.
   * SECURITY: Strictly requires authenticated founder email matching the floor record.
   */
  static async deleteFloor(
    floorId: string,
    email: string
  ): Promise<{ success: boolean; message: string; rank?: number }> {
    if (!floorId?.trim() || !email?.trim()) {
      return {
        success: false,
        message: "Authentication required: founder email must be provided to vacate a floor.",
      };
    }
    const cleanEmail = email.toLowerCase().trim();

    const existing = await db
      .select()
      .from(floors)
      .where(and(eq(floors.id, floorId.trim()), eq(floors.userEmail, cleanEmail)))
      .limit(1);

    if (existing.length === 0) {
      return {
        success: false,
        message: "Floor not found or you are not authorized to vacate it.",
      };
    }

    const current = existing[0];
    await db
      .delete(floors)
      .where(and(eq(floors.id, floorId.trim()), eq(floors.userEmail, cleanEmail)));

    return {
      success: true,
      message: `Floor for ${current.companyName || current.companyUrl} has been vacated.`,
    };
  }

  /**
   * Atomic transactional floor claim based purely on pricePaid leaderboard ranking.
   */
  static async claimTopFloorTransaction(
    input: ClaimFloorPreparedInput
  ): Promise<ClaimResultModelResponse> {
    return await db.transaction(async (tx) => {
      const cleanHost = extractRootHostname(input.companyUrl).toLowerCase();
      const companyName = (input.companyName?.trim() || cleanHost).toLowerCase();

      // 1. Check if website already claimed on the skyscraper (targeted domain query)
      const candidateFloors = await tx
        .select()
        .from(floors)
        .where(
          or(
            sql`${floors.companyUrl} ILIKE ${"%" + cleanHost + "%"}`,
            sql`${floors.companyName} ILIKE ${"%" + cleanHost + "%"}`
          )
        );

      const existingFloor = candidateFloors.find(
        (f) =>
          extractRootHostname(f.companyUrl || "") === cleanHost ||
          f.companyName?.toLowerCase() === cleanHost.toLowerCase()
      );

      // 2. Check if claim already succeeded (idempotent replay)
      const existingClaims = await tx
        .select()
        .from(claims)
        .where(
          sql`${claims.checkoutSessionId} = ${input.checkoutSessionId} OR (${
            input.paymentId ? sql`${claims.paymentId} = ${input.paymentId}` : sql`false`
          })`
        )
        .limit(1);

      const existingClaim = existingClaims[0];
      if (existingClaim && existingClaim.status === "succeeded") {
        let rank = 1;
        if (existingFloor) {
          const higherCount = await tx
            .select({ count: sql<number>`count(*)` })
            .from(floors)
            .where(
              sql`${floors.pricePaid} > ${existingFloor.pricePaid} OR (${floors.pricePaid} = ${existingFloor.pricePaid} AND ${floors.claimedAt} < ${existingFloor.claimedAt})`
            );
          rank = Number(higherCount[0]?.count || 0) + 1;
        }
        return {
          success: true,
          rank,
          id: existingFloor?.id,
          companyName: existingClaim.companyName || companyName,
          companyUrl: existingClaim.companyUrl || input.companyUrl,
          logoUrl: existingFloor?.logoUrl || input.logoUrl,
          tagline: existingFloor?.tagline || input.tagline,
          description: existingFloor?.description || input.description,
          pricePaid: existingFloor ? Number(existingFloor.pricePaid) : input.price,
          isUpdate: Boolean(existingFloor),
          floor: existingFloor,
          message: "Payment already successfully processed.",
        };
      }

      let finalPrice = input.price;
      let targetFloor: Floor;
      const isUpdate = Boolean(existingFloor);

      // 3. If existing floor found, update in-place with added price; otherwise insert new floor
      if (existingFloor) {
        finalPrice = Number(existingFloor.pricePaid || 0) + input.price;

        const [updatedFloor] = await tx
          .update(floors)
          .set({
            companyName: companyName || existingFloor.companyName || cleanHost,
            companyUrl: input.companyUrl || existingFloor.companyUrl,
            category: input.category || existingFloor.category,
            tagline: input.tagline || existingFloor.tagline,
            description: input.description || existingFloor.description,
            logoUrl: input.logoUrl || existingFloor.logoUrl,
            pricePaid: finalPrice,
            userEmail: input.customerEmail || existingFloor.userEmail,
            claimedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(floors.id, existingFloor.id))
          .returning();

        targetFloor = updatedFloor;
      } else {
        const [insertedFloor] = await tx
          .insert(floors)
          .values({
            companyName: companyName || cleanHost,
            companyUrl: input.companyUrl,
            category: input.category,
            tagline: input.tagline,
            description: input.description,
            logoUrl: input.logoUrl,
            pricePaid: finalPrice,
            userEmail: input.customerEmail,
            claimedAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        targetFloor = insertedFloor;
      }

      // 4. Determine assigned rank based on pricePaid order via SQL COUNT
      const higherCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(floors)
        .where(
          sql`${floors.pricePaid} > ${finalPrice} OR (${floors.pricePaid} = ${finalPrice} AND ${floors.claimedAt} < ${targetFloor.claimedAt})`
        );

      const assignedRank = Number(higherCount[0]?.count || 0) + 1;

      // 5. Upsert claim record
      await tx
        .insert(claims)
        .values({
          paymentId: input.paymentId || null,
          checkoutSessionId: input.checkoutSessionId,
          status: "succeeded",
          companyName: companyName || cleanHost,
          companyUrl: input.companyUrl,
          category: input.category,
          amount: input.price,
          currency: "INR",
          customerEmail: input.customerEmail || undefined,
          customerPhone: input.customerPhone || undefined,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: claims.checkoutSessionId,
          set: {
            paymentId: input.paymentId || undefined,
            status: "succeeded",
            companyName: companyName || cleanHost,
            amount: input.price,
            customerPhone: input.customerPhone || undefined,
            updatedAt: new Date(),
          },
        });

      return {
        success: true,
        rank: assignedRank,
        id: targetFloor.id,
        companyName: targetFloor.companyName,
        companyUrl: targetFloor.companyUrl,
        logoUrl: targetFloor.logoUrl,
        tagline: targetFloor.tagline,
        description: targetFloor.description,
        pricePaid: finalPrice,
        isUpdate,
        floor: toPublicFloor(targetFloor),
        message: isUpdate
          ? `Successfully boosted floor for ${targetFloor.companyName} to ₹${finalPrice} (Floor #${assignedRank})!`
          : `Successfully claimed Floor #${assignedRank} for ${targetFloor.companyName}!`,
      };
    });
  }
}
