import { eq, and, sql, or } from "drizzle-orm";
import { db } from "@/lib/db/config/client";
import { unstable_cache } from "next/cache";
import { extractRootHostname } from "@/lib/validation/domain";
import { floors, claims, users, type Floor, type NewFloor } from "@/lib/db/config/schema";

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

export class FloorsModel {
  /**
   * Fetch active claimed skyscraper floors sorted by pricePaid DESC, claimedAt ASC.
   * Rank is dynamically assigned based on leaderboard position.
   */
  static async getActiveFloors(): Promise<Floor[]> {
    const cachedFloors = unstable_cache(
      async () => {
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
            return {
              ...floor,
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
      ["active-claimed-floors"],
      {
        tags: ["floors"],
        revalidate: 60,
      }
    );

    return await cachedFloors();
  }

  /**
   * Fetch a single floor by ID.
   */
  static async getFloorById(id: string): Promise<Floor | null> {
    const cachedFloor = unstable_cache(
      async () => {
        const active = await FloorsModel.getActiveFloors();
        const activeFloor = active.find((f) => f.id === id);
        if (activeFloor) return activeFloor;

        const floor = await db.query.floors.findFirst({
          where: (f, { eq }) => eq(f.id, id),
        });
        return floor || null;
      },
      [`floor-${id}`],
      {
        tags: [`floor-${id}`, "floors"],
        revalidate: 60,
      }
    );

    return await cachedFloor();
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

      return (
        candidates.find(
          (f) =>
            extractRootHostname(f.companyUrl || "") === cleanHost ||
            f.companyName?.toLowerCase() === cleanHost.toLowerCase()
        ) || null
      );
    } catch (err) {
      console.warn("Error finding floor by host:", err);
      return null;
    }
  }

  /**
   * Fetch all claimed floors owned by a founder email or user ID.
   */
  static async getFloorsByEmail(email: string): Promise<Floor[]> {
    const cachedUserFloors = unstable_cache(
      async () => {
        const active = await FloorsModel.getActiveFloors();
        const result = await db.query.floors.findMany({
          where: (f, { eq, sql, or }) =>
            or(
              eq(f.userEmail, email),
              sql`${f.userId} IN (SELECT id FROM users WHERE email = ${email})`
            ),
          orderBy: (f, { desc, asc }) => [desc(f.pricePaid), asc(f.claimedAt)],
        });

        return result.map((f) => {
          const activeMatch = active.find((a) => a.id === f.id);
          return activeMatch ? activeMatch : f;
        });
      },
      [`floors-owner-${email}`],
      {
        tags: [`floors-owner-${email}`, "floors"],
        revalidate: 60,
      }
    );

    return await cachedUserFloors();
  }

  /**
   * Update a floor record in the database.
   */
  static async updateFloor(
    floorId: string,
    email: string,
    payload: Partial<NewFloor>
  ): Promise<Floor | null> {
    const existing = await db
      .select()
      .from(floors)
      .where(
        and(
          eq(floors.id, floorId),
          or(
            eq(floors.userEmail, email),
            sql`${floors.userId} IN (SELECT id FROM users WHERE email = ${email})`
          )
        )
      )
      .limit(1);

    if (existing.length === 0) return null;

    await db
      .update(floors)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(floors.id, floorId));

    const updated = await db.select().from(floors).where(eq(floors.id, floorId)).limit(1);
    return updated[0] || null;
  }

  /**
   * Vacate a floor in the database.
   */
  static async deleteFloor(
    floorId: string,
    email: string
  ): Promise<{ success: boolean; message: string; rank?: number }> {
    const existing = await db
      .select()
      .from(floors)
      .where(
        and(
          eq(floors.id, floorId),
          or(
            eq(floors.userEmail, email),
            sql`${floors.userId} IN (SELECT id FROM users WHERE email = ${email})`
          )
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return {
        success: false,
        message: "Floor not found or you are not authorized to manage it.",
      };
    }

    const current = existing[0];
    await db.delete(floors).where(eq(floors.id, floorId));

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

      // 1. Check if claim already succeeded
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
        const higherCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(floors)
          .where(
            sql`${floors.pricePaid} > (SELECT price_paid FROM floors WHERE company_url = ${input.companyUrl} LIMIT 1)`
          );
        const rank = Number(higherCount[0]?.count || 0) + 1;
        return {
          success: true,
          rank,
          companyName: existingClaim.companyName || companyName,
          companyUrl: existingClaim.companyUrl || input.companyUrl,
          logoUrl: input.logoUrl,
          tagline: input.tagline,
          description: input.description,
          message: "Payment already successfully processed.",
        };
      }

      // 2. Check if website already claimed on the skyscraper (targeted query)
      const candidateFloors = await tx
        .select()
        .from(floors)
        .where(
          or(
            input.customerEmail ? eq(floors.userEmail, input.customerEmail) : sql`false`,
            sql`${floors.companyUrl} ILIKE ${"%" + cleanHost + "%"}`,
            sql`${floors.companyName} ILIKE ${"%" + cleanHost + "%"}`
          )
        );

      const existingFloor = candidateFloors.find(
        (f) =>
          extractRootHostname(f.companyUrl || "") === cleanHost ||
          f.companyName?.toLowerCase() === cleanHost.toLowerCase()
      );

      let finalPrice = input.price;
      let targetFloor: Floor;
      const isUpdate = Boolean(existingFloor);

      // 3. User upsert if customer email provided
      let userId: string | null = null;
      if (input.customerEmail) {
        const [upsertedUser] = await tx
          .insert(users)
          .values({
            email: input.customerEmail,
            name: input.customerName || null,
            phone: input.customerPhone,
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              ...(input.customerName ? { name: input.customerName } : {}),
              ...(input.customerPhone ? { phone: input.customerPhone } : {}),
              updatedAt: new Date(),
            },
          })
          .returning({ id: users.id });

        userId = upsertedUser?.id ?? null;
      }

      // 4. If existing floor found, update in-place with added price; otherwise insert new floor
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
            userId: userId || existingFloor.userId,
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
            userId: userId,
            claimedAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        targetFloor = insertedFloor;
      }

      // 5. Determine assigned rank based on pricePaid order via SQL COUNT
      const higherCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(floors)
        .where(
          sql`${floors.pricePaid} > ${finalPrice} OR (${floors.pricePaid} = ${finalPrice} AND ${floors.claimedAt} < ${targetFloor.claimedAt})`
        );

      const assignedRank = Number(higherCount[0]?.count || 0) + 1;

      // 6. Upsert claim record
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
          userId: userId || undefined,
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
            userId: userId || undefined,
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
        floor: targetFloor,
        message: isUpdate
          ? `Successfully boosted floor for ${targetFloor.companyName} to ₹${finalPrice} (Floor #${assignedRank})!`
          : `Successfully claimed Floor #${assignedRank} for ${targetFloor.companyName}!`,
      };
    });
  }
}
