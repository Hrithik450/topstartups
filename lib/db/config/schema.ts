import {
  pgTable,
  serial,
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
    id: serial("id").primaryKey(),
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
    id: serial("id").primaryKey(),
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
    userId: integer("user_id").references(() => users.id),
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
 * Email OTPs for passwordless, token-free floor management verification.
 */
export const emailOtps = pgTable(
  "email_otps",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    code: varchar("code", { length: 6 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("email_otps_email_idx").on(table.email),
  })
);

export type EmailOtp = typeof emailOtps.$inferSelect;
export type NewEmailOtp = typeof emailOtps.$inferInsert;

/**
 * Claims / Payments ledger:
 * Tracks Dodo Payments checkout sessions and verified webhook transactions.
 */
export const claims = pgTable(
  "claims",
  {
    id: serial("id").primaryKey(),
    paymentId: varchar("payment_id", { length: 255 }).notNull().unique(), // Dodo payment id or mock id
    status: varchar("status", { length: 64 }).notNull().default("pending"), // 'pending' | 'succeeded' | 'failed'
    companyName: varchar("company_name", { length: 255 }).notNull(),
    url: varchar("url", { length: 512 }).notNull(),
    category: varchar("category", { length: 128 }),
    amount: integer("amount").notNull(), // amount in INR
    currency: varchar("currency", { length: 10 }).notNull().default("INR"),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerPhone: varchar("customer_phone", { length: 50 }),
    userId: integer("user_id").references(() => users.id),
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

