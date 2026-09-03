import {
  pgTable,
  uuid,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Users table:
 * Represents startup founders and floor owners.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * Floors table representing the 50 floors of the GeTopFloor skyscraper.
 * Rank 1 is the top penthouse floor.
 * Unclaimed floors are premium placeholders waiting to be claimed.
 */
export const floors = pgTable(
  "floors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rank: integer("rank").notNull().unique(), // 1 = top penthouse floor, 50 = base
    isClaimed: boolean("is_claimed").notNull().default(false),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    url: varchar("url", { length: 512 }).notNull(),
    category: varchar("category", { length: 128 }),
    tagline: text("tagline"),
    description: text("description"),
    logoUrl: text("logo_url"),
    pricePaid: integer("price_paid").notNull().default(0), // in INR
    manageToken: varchar("manage_token", { length: 128 }),
    ownerEmail: varchar("owner_email", { length: 255 }),
    userId: uuid("user_id").references(() => users.id),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    rankIdx: index("floors_rank_idx").on(table.rank),
    isClaimedIdx: index("floors_is_claimed_idx").on(table.isClaimed),
    manageTokenIdx: index("floors_manage_token_idx").on(table.manageToken),
    ownerEmailIdx: index("floors_owner_email_idx").on(table.ownerEmail),
    userIdIdx: index("floors_user_id_idx").on(table.userId),
  })
);

export type Floor = typeof floors.$inferSelect;
export type NewFloor = typeof floors.$inferInsert;

/**
 * Claims / Payments ledger:
 * Tracks Dodo Payments checkout sessions and verified webhook transactions.
 */
export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentId: varchar("payment_id", { length: 255 }).notNull().unique(), // Dodo payment id or mock id
    status: varchar("status", { length: 64 }).notNull().default("pending"), // 'pending' | 'succeeded' | 'failed'
    companyName: varchar("company_name", { length: 255 }).notNull(),
    url: varchar("url", { length: 512 }).notNull(),
    category: varchar("category", { length: 128 }),
    amount: integer("amount").notNull(), // amount in INR
    currency: varchar("currency", { length: 10 }).notNull().default("INR"),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerPhone: varchar("customer_phone", { length: 50 }),
    userId: uuid("user_id").references(() => users.id),
    manageToken: varchar("manage_token", { length: 128 }),
    checkoutUrl: text("checkout_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    paymentIdIdx: index("claims_payment_id_idx").on(table.paymentId),
    statusIdx: index("claims_status_idx").on(table.status),
    userIdIdx: index("claims_user_id_idx").on(table.userId),
  })
);

export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;

/**
 * Site statistics for tracking real cumulative views.
 */
export const siteStats = pgTable("site_stats", {
  key: varchar("key", { length: 64 }).primaryKey(), // 'global'
  totalViews: integer("total_views").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SiteStat = typeof siteStats.$inferSelect;
export type NewSiteStat = typeof siteStats.$inferInsert;

/**
 * Real unique countries visited from.
 */
export const visitorCountries = pgTable("visitor_countries", {
  countryCode: varchar("country_code", { length: 10 }).primaryKey(),
  countryName: varchar("country_name", { length: 100 }),
  visitCount: integer("visit_count").notNull().default(1),
  lastVisitedAt: timestamp("last_visited_at", { withTimezone: true }).defaultNow().notNull(),
});

export type VisitorCountry = typeof visitorCountries.$inferSelect;
export type NewVisitorCountry = typeof visitorCountries.$inferInsert;

/**
 * Active sessions for tracking real live concurrent online users.
 * Online = active within the last 2 minutes.
 */
export const activeSessions = pgTable("active_sessions", {
  sessionId: varchar("session_id", { length: 128 }).primaryKey(),
  countryCode: varchar("country_code", { length: 10 }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ActiveSession = typeof activeSessions.$inferSelect;
export type NewActiveSession = typeof activeSessions.$inferInsert;

/**
 * Floor Claim Locks:
 * Concurrency control to prevent race conditions when multiple users attempt to claim
 * the Top Floor (#1) simultaneously. Holds a reservation window while payment is processing.
 */
export const floorLocks = pgTable("floor_locks", {
  targetRank: integer("target_rank").primaryKey().default(1),
  lockedByEmail: varchar("locked_by_email", { length: 255 }),
  lockedByPaymentId: varchar("locked_by_payment_id", { length: 255 }),
  companyName: varchar("company_name", { length: 255 }),
  lockedAt: timestamp("locked_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type FloorLock = typeof floorLocks.$inferSelect;
export type NewFloorLock = typeof floorLocks.$inferInsert;


