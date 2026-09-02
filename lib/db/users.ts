import { db } from "./client";
import { users, type User, type NewUser } from "./schema";
import { eq } from "drizzle-orm";

/**
 * Find or create a user by email address.
 * Automatically trims and lowercases email for consistency.
 */
export async function getOrCreateUser(email: string, name?: string): Promise<User> {
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name?.trim() || null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, cleanEmail))
    .limit(1);

  if (existing.length > 0) {
    // If name is newly provided and wasn't set, update it
    if (cleanName && !existing[0].name) {
      const [updated] = await db
        .update(users)
        .set({ name: cleanName, updatedAt: new Date() })
        .where(eq(users.id, existing[0].id))
        .returning();
      return updated || existing[0];
    }
    return existing[0];
  }

  const [created] = await db
    .insert(users)
    .values({
      email: cleanEmail,
      name: cleanName,
    })
    .returning();

  return created;
}

/**
 * Fetch user by email.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
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
 * Update user details (name, avatar).
 */
export async function updateUser(
  id: number,
  data: { name?: string; avatarUrl?: string }
): Promise<User | null> {
  const [updated] = await db
    .update(users)
    .set({
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl.trim() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  return updated || null;
}
