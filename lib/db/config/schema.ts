import {
  pgTable,
  uuid,
  integer,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Floors table representing the claimed floors of the skyscraper.
 * Position and leaderboard rank are derived purely from ordering by pricePaid DESC, claimedAt ASC.
 */
export const floors = pgTable(
  "floors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    companyUrl: varchar("company_url", { length: 512 }).notNull(),
    category: varchar("category", { length: 128 }),
    tagline: text("tagline"),
    description: text("description"),
    logoUrl: text("logo_url"),
    pricePaid: integer("price_paid").notNull().default(0), // in INR
    userEmail: varchar("user_email", { length: 255 }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pricePaidIdx: index("floors_price_paid_idx").on(table.pricePaid),
    userEmailIdx: index("floors_user_email_idx").on(table.userEmail),
  })
);

export type Floor = typeof floors.$inferSelect & { rank?: number };
export type NewFloor = typeof floors.$inferInsert;

/**
 * Claims / Payments ledger:
 * Tracks Dodo Payments checkout sessions and verified webhook transactions.
 */
export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentId: varchar("payment_id", { length: 255 }).unique(), // Dodo payment id (pay_...)
    checkoutSessionId: varchar("checkout_session_id", { length: 255 }).notNull().unique(), // Dodo checkout session id (cks_...)
    status: varchar("status", { length: 64 }).notNull().default("pending"), // 'pending' | 'succeeded' | 'failed'
    companyName: varchar("company_name", { length: 255 }).notNull(),
    companyUrl: varchar("company_url", { length: 512 }).notNull(),
    category: varchar("category", { length: 128 }),
    amount: integer("amount").notNull(), // amount in INR
    currency: varchar("currency", { length: 10 }).notNull().default("INR"),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerPhone: varchar("customer_phone", { length: 50 }),
    checkoutUrl: text("checkout_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    paymentIdIdx: index("claims_payment_id_idx").on(table.paymentId),
    checkoutSessionIdIdx: index("claims_checkout_session_id_idx").on(table.checkoutSessionId),
    statusIdx: index("claims_status_idx").on(table.status),
  })
);

export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;

/**
 * Visitor sessions table for real-time online presence heartbeat and geographic distribution.
 */
export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("sessionToken").primaryKey(),
    countryCode: varchar("country_code", { length: 10 }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    expires: timestamp("expires", { mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    lastSeenAtIdx: index("sessions_last_seen_at_idx").on(table.lastSeenAt),
  })
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

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
