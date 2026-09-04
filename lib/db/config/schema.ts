import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  integer,
  varchar,
  text,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
export type AdapterAccountType = "oauth" | "oidc" | "email" | "webauthn";

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
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
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

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("sessionToken").primaryKey(),
    userId: uuid("userId").references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }),
    countryCode: varchar("country_code", { length: 10 }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    lastSeenAtIdx: index("sessions_last_seen_at_idx").on(table.lastSeenAt),
  })
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

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
    userId: uuid("user_id").references(() => users.id),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pricePaidIdx: index("floors_price_paid_idx").on(table.pricePaid),
    userEmailIdx: index("floors_user_email_idx").on(table.userEmail),
    userIdIdx: index("floors_user_id_idx").on(table.userId),
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
    userId: uuid("user_id").references(() => users.id),
    checkoutUrl: text("checkout_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    paymentIdIdx: index("claims_payment_id_idx").on(table.paymentId),
    checkoutSessionIdIdx: index("claims_checkout_session_id_idx").on(table.checkoutSessionId),
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
 * Table Relations
 */
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  floors: many(floors),
  claims: many(claims),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const floorsRelations = relations(floors, ({ one }) => ({
  user: one(users, {
    fields: [floors.userId],
    references: [users.id],
  }),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  user: one(users, {
    fields: [claims.userId],
    references: [users.id],
  }),
}));
