import { users, type User } from "@/lib/db/config/schema";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db/config/client";
import { eq } from "drizzle-orm";

export class UserModel {
  /**
   * Fetch user by email from database with caching (read-only).
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const cachedUser = unstable_cache(
      async () => {
        try {
          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });
          return user || null;
        } catch (err) {
          console.warn(`Could not fetch user by email (${email}):`, err);
          return null;
        }
      },
      [`user-${email}`],
      {
        tags: [`user-${email}`, "users"],
        revalidate: 60,
      }
    );

    return await cachedUser();
  }

  /**
   * Fetch user by ID from database with caching (read-only).
   */
  static async getUserById(id: string): Promise<User | null> {
    const cachedUser = unstable_cache(
      async () => {
        try {
          const user = await db.query.users.findFirst({
            where: eq(users.id, id),
          });
          return user || null;
        } catch (err) {
          console.warn(`Could not fetch user by ID (${id}):`, err);
          return null;
        }
      },
      [`user-id-${id}`],
      {
        tags: [`user-id-${id}`, "users"],
        revalidate: 60,
      }
    );

    return await cachedUser();
  }

  /**
   * Fetch a single user along with their claimed floors by User ID (read-only with caching).
   * Uses Drizzle ORM relational query API (`with: { floors: ... }`).
   */
  static async getUserWithFloors(id: string) {
    const cachedUser = unstable_cache(
      async () => {
        try {
          const user = await db.query.users.findFirst({
            where: eq(users.id, id),
            with: {
              floors: {
                orderBy: (f, { desc, asc }) => [desc(f.pricePaid), asc(f.claimedAt)],
              },
            },
          });
          return user || null;
        } catch (err) {
          console.warn(`Could not fetch user with floors by ID (${id}):`, err);
          return null;
        }
      },
      [`user-with-floors-id-${id}`],
      {
        tags: [`user-id-${id}`, "users", "floors"],
        revalidate: 60,
      }
    );

    return await cachedUser();
  }

  /**
   * Fetch a single user along with their claimed floors by User Email (read-only with caching).
   * Uses Drizzle ORM relational query API (`with: { floors: ... }`).
   */
  static async getUserWithFloorsByEmail(email: string) {
    const cachedUser = unstable_cache(
      async () => {
        try {
          const user = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase().trim()),
            with: {
              floors: {
                orderBy: (f, { desc, asc }) => [desc(f.pricePaid), asc(f.claimedAt)],
              },
            },
          });
          return user || null;
        } catch (err) {
          console.warn(`Could not fetch user with floors by email (${email}):`, err);
          return null;
        }
      },
      [`user-with-floors-email-${email.toLowerCase().trim()}`],
      {
        tags: [`user-${email.toLowerCase().trim()}`, "users", "floors"],
        revalidate: 60,
      }
    );

    return await cachedUser();
  }

  /**
   * Fetch all users along with their claimed floors (read-only with caching).
   * Uses Drizzle ORM relational query API (`with: { floors: ... }`) in a single DB call.
   */
  static async getAllUsersWithFloors() {
    const cachedUsersWithFloors = unstable_cache(
      async () => {
        try {
          return await db.query.users.findMany({
            orderBy: (u, { desc }) => [desc(u.createdAt)],
            with: {
              floors: {
                orderBy: (f, { desc, asc }) => [desc(f.pricePaid), asc(f.claimedAt)],
              },
            },
          });
        } catch (err) {
          console.warn("Could not fetch users with floors:", err);
          return [];
        }
      },
      ["all-users-with-floors"],
      {
        tags: ["users", "floors"],
        revalidate: 60,
      }
    );

    return await cachedUsersWithFloors();
  }
}
