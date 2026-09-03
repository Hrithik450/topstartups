import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { Pool } from "pg";
import { getDirectDatabaseUrl } from "../lib/db/config/pool-config";
import { getPostgresSsl } from "../lib/db/config/ssl";

const PLACEHOLDER_TITLES = [
  "Penthouse Floor #1 — Open for Claim",
  "Skyline Suite #2 — Open for Claim",
  "Summit Level #3 — Open for Claim",
  "High Altitude Deck #4 — Spot Reserved",
  "Executive Floor #5 — Spot Reserved",
  "Venture Vista #6 — Spot Reserved",
  "Sky Lounge Level #7 — Open for Claim",
  "Horizon Terrace #8 — Spot Reserved",
  "Cloudview Floor #9 — Spot Reserved",
  "Apex Studio #10 — Open for Claim",
];

function getPlaceholderTitle(rank: number): string {
  if (rank <= 10) return PLACEHOLDER_TITLES[rank - 1];
  return `Tower Floor #${rank} — Spot Reserved`;
}

async function resetDb() {
  const connectionString = getDirectDatabaseUrl();
  console.log(`Connecting to Supabase / PostgreSQL database...`);
  const ssl = getPostgresSsl(connectionString);

  const pool = new Pool({
    connectionString,
    ssl: ssl === false ? undefined : ssl,
  });

  try {
    console.log("1. Dropping old schema and recreating tables with UUID primary keys...");
    await pool.query(`DROP TABLE IF EXISTS claims CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS floors CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS users CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS email_otps CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS active_sessions CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS visitor_countries CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS floor_locks CASCADE;`);

    // 1. Users Table (UUID)
    await pool.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        phone VARCHAR(50),
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX users_email_idx ON users (email);
    `);

    // 2. Floors Table (UUID)
    await pool.query(`
      CREATE TABLE floors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rank INTEGER NOT NULL UNIQUE,
        is_claimed BOOLEAN NOT NULL DEFAULT false,
        company_name VARCHAR(255) NOT NULL,
        url VARCHAR(512) NOT NULL,
        category VARCHAR(128),
        tagline TEXT,
        description TEXT,
        logo_url TEXT,
        price_paid INTEGER NOT NULL DEFAULT 50,
        manage_token VARCHAR(128),
        owner_email VARCHAR(255),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        claimed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX floors_rank_idx ON floors (rank);
      CREATE INDEX floors_is_claimed_idx ON floors (is_claimed);
      CREATE INDEX floors_manage_token_idx ON floors (manage_token);
      CREATE INDEX floors_owner_email_idx ON floors (owner_email);
      CREATE INDEX floors_user_id_idx ON floors (user_id);
    `);

    // 3. Claims Ledger Table (UUID)
    await pool.query(`
      CREATE TABLE claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(64) NOT NULL DEFAULT 'pending',
        company_name VARCHAR(255) NOT NULL,
        url VARCHAR(512) NOT NULL,
        category VARCHAR(128),
        amount INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        target_rank INTEGER DEFAULT 1,
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        manage_token VARCHAR(128),
        checkout_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX claims_payment_id_idx ON claims (payment_id);
      CREATE INDEX claims_status_idx ON claims (status);
      CREATE INDEX claims_user_id_idx ON claims (user_id);
    `);

    // 4. Site Stats, Visitor Countries, Active Sessions, Floor Locks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_stats (
        key VARCHAR(64) PRIMARY KEY,
        total_views INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS visitor_countries (
        country_code VARCHAR(10) PRIMARY KEY,
        country_name VARCHAR(100),
        visit_count INTEGER NOT NULL DEFAULT 1,
        last_visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS active_sessions (
        session_id VARCHAR(128) PRIMARY KEY,
        country_code VARCHAR(10),
        last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS floor_locks (
        target_rank INTEGER PRIMARY KEY DEFAULT 1,
        locked_by_email VARCHAR(255),
        locked_by_payment_id VARCHAR(255),
        company_name VARCHAR(255),
        locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);

    console.log("2. Resetting site stats (0 baseline visitors)...");
    await pool.query(`
      INSERT INTO site_stats (key, total_views, updated_at)
      VALUES ('global', 0, NOW())
      ON CONFLICT (key) DO UPDATE SET total_views = 0, updated_at = NOW();
    `);

    console.log("3. Seeding 50 pristine skyscraper floors with pricing ladder (Floor 50 = ₹50, Floor 1 = ₹99)...");
    for (let rank = 1; rank <= 50; rank++) {
      // Pricing ladder: Floor 50 = ₹50, Floor 49 = ₹51, ..., Top Floor #1 = ₹99
      const price = 50 + (50 - rank);
      await pool.query(
        `
        INSERT INTO floors (rank, is_claimed, company_name, url, category, tagline, description, price_paid, claimed_at, owner_email, user_id)
        VALUES ($1, false, $2, 'https://getopfloor.com', 'Available Floor', 'Spot reserved for your startup — Outbid & claim top floor', 'This floor is waiting for an ambitious company. Enter your URL and claim this floor to put your company on the world stage.', $3, NULL, NULL, NULL)
        `,
        [rank, getPlaceholderTitle(rank), price]
      );
    }

    const countRes = await pool.query(`SELECT COUNT(*)::int as cnt FROM floors WHERE is_claimed = false;`);
    const usersRes = await pool.query(`SELECT COUNT(*)::int as cnt FROM users;`);
    const claimsRes = await pool.query(`SELECT COUNT(*)::int as cnt FROM claims;`);

    console.log(`\n========================================`);
    console.log(`✓ Database Reset & UUID Migration Complete!`);
    console.log(`- Pristine Available Floors: ${countRes.rows[0].cnt} / 50`);
    console.log(`- Claimed Floors: 0`);
    console.log(`- Users: ${usersRes.rows[0].cnt}`);
    console.log(`- Claims: ${claimsRes.rows[0].cnt}`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error("Error resetting database:", err);
  } finally {
    await pool.end();
  }
}

resetDb();
