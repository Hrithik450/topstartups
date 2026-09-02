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
 * Floors table representing the 50 floors of the BharatHunt skyscraper.
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
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    rankIdx: index("floors_rank_idx").on(table.rank),
    isClaimedIdx: index("floors_is_claimed_idx").on(table.isClaimed),
    manageTokenIdx: index("floors_manage_token_idx").on(table.manageToken),
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
    id: serial("id").primaryKey(),
    paymentId: varchar("payment_id", { length: 255 }).notNull().unique(), // Dodo payment id or mock id
    status: varchar("status", { length: 64 }).notNull().default("pending"), // 'pending' | 'succeeded' | 'failed'
    companyName: varchar("company_name", { length: 255 }).notNull(),
    url: varchar("url", { length: 512 }).notNull(),
    category: varchar("category", { length: 128 }),
    amount: integer("amount").notNull(), // amount in INR
    currency: varchar("currency", { length: 10 }).notNull().default("INR"),
    customerEmail: varchar("customer_email", { length: 255 }),
    manageToken: varchar("manage_token", { length: 128 }),
    checkoutUrl: text("checkout_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    paymentIdIdx: index("claims_payment_id_idx").on(table.paymentId),
    statusIdx: index("claims_status_idx").on(table.status),
  })
);

export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;
