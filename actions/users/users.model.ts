import { db } from "@/lib/db/client";
import { users, floors, type User, type NewUser } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { UserWithProducts } from "./users.types";

export class UsersModel {
  /**
   * Find or create a user by email using pure Drizzle.
   */
  static async getOrCreateUser(
    email: string,
    name?: string,
    phone?: string
  ): Promise<User> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name?.trim() || null;
    const cleanPhone = phone?.trim() || null;

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existing.length > 0) {
      const user = existing[0];
      const updates: Partial<NewUser> = {};
      if (cleanName && !user.name) updates.name = cleanName;
      if (cleanPhone && !user.phone) updates.phone = cleanPhone;

      if (Object.keys(updates).length > 0) {
        const [updated] = await db
          .update(users)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(users.id, user.id))
          .returning();
        return updated || user;
      }
      return user;
    }

    const [created] = await db
      .insert(users)
      .values({
        email: cleanEmail,
        name: cleanName,
        phone: cleanPhone,
      })
      .returning();

    return created;
  }

  /**
   * Fetch user by email using pure Drizzle.
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    if (!email?.trim()) return null;
    const cleanEmail = email.toLowerCase().trim();
    const res = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    return res[0] || null;
  }

  /**
   * Update user details using pure Drizzle.
   */
  static async updateUser(
    id: number,
    data: { name?: string; phone?: string; avatarUrl?: string }
  ): Promise<User | null> {
    const [updated] = await db
      .update(users)
      .set({
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl.trim() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Admin: Get all users joined with their products using pure Drizzle.
   */
  static async getAllUsersWithProducts(): Promise<UserWithProducts[]> {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    const allClaimedFloors = await db
      .select()
      .from(floors)
      .where(eq(floors.isClaimed, true))
      .orderBy(floors.rank);

    return allUsers.map((u) => {
      const userFloors = allClaimedFloors.filter(
        (f) =>
          f.userId === u.id ||
          (f.ownerEmail && f.ownerEmail.toLowerCase().trim() === u.email.toLowerCase().trim())
      );

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        createdAt: u.createdAt,
        productCount: userFloors.length,
        products: userFloors.map((f) => ({
          id: f.id,
          rank: f.rank,
          companyName: f.companyName,
          url: f.url,
          category: f.category,
          pricePaid: f.pricePaid,
          claimedAt: f.claimedAt,
        })),
      };
    });
  }
}
