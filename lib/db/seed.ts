import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { floors } from "./schema";
import { getDirectDatabaseUrl } from "./pool-config";
import { getPostgresSsl } from "./ssl";

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

export async function seedFloors() {
  const connectionString = getDirectDatabaseUrl();
  console.log(`Connecting to database for seeding...`);
  const ssl = getPostgresSsl(connectionString);

  const pool = new Pool({
    connectionString,
    ssl: ssl === false ? undefined : ssl,
  });

  const db = drizzle(pool);

  console.log(`Checking existing floors...`);
  // Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS floors (
      id SERIAL PRIMARY KEY,
      rank INTEGER NOT NULL UNIQUE,
      is_claimed BOOLEAN NOT NULL DEFAULT false,
      company_name VARCHAR(255) NOT NULL,
      url VARCHAR(512) NOT NULL,
      category VARCHAR(128),
      tagline TEXT,
      description TEXT,
      logo_url TEXT,
      price_paid INTEGER NOT NULL DEFAULT 0,
      claimed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS floors_rank_idx ON floors (rank);
    CREATE INDEX IF NOT EXISTS floors_is_claimed_idx ON floors (is_claimed);

    CREATE TABLE IF NOT EXISTS claims (
      id SERIAL PRIMARY KEY,
      payment_id VARCHAR(255) NOT NULL UNIQUE,
      status VARCHAR(64) NOT NULL DEFAULT 'pending',
      company_name VARCHAR(255) NOT NULL,
      url VARCHAR(512) NOT NULL,
      category VARCHAR(128),
      amount INTEGER NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      customer_email VARCHAR(255),
      checkout_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS claims_payment_id_idx ON claims (payment_id);
    CREATE INDEX IF NOT EXISTS claims_status_idx ON claims (status);
  `);

  const countRes = await pool.query(`SELECT COUNT(*)::int as cnt FROM floors`);
  const existingCount = countRes.rows[0]?.cnt || 0;

  if (existingCount >= 50) {
    console.log(`Floors already populated (${existingCount} floors found). Skipping seed.`);
    await pool.end();
    return;
  }

  console.log(`Generating 50 premium placeholder floors...`);
  const placeholderFloors = Array.from({ length: 50 }, (_, i) => {
    const rank = i + 1;
    // Price curve: rank 1 starts at ₹46, stepping down to ₹1
    const price = Math.max(1, 46 - Math.floor((rank - 1) * 0.9));
    return {
      rank,
      isClaimed: false,
      companyName: getPlaceholderTitle(rank),
      url: "https://bharathunt.com",
      category: "Available Floor",
      tagline: "Spot reserved for your startup — Outbid & claim top floor",
      description:
        "This floor is waiting for an ambitious company. Enter your URL and claim this floor to put your company on the world stage.",
      pricePaid: price,
      claimedAt: null,
    };
  });

  for (const f of placeholderFloors) {
    await pool.query(
      `
      INSERT INTO floors (rank, is_claimed, company_name, url, category, tagline, description, price_paid, claimed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (rank) DO NOTHING
    `,
      [
        f.rank,
        f.isClaimed,
        f.companyName,
        f.url,
        f.category,
        f.tagline,
        f.description,
        f.pricePaid,
        f.claimedAt,
      ]
    );
  }

  console.log(`Successfully seeded 50 premium placeholder skyscraper floors!`);
  await pool.end();
}

// Allow CLI execution: `npx tsx lib/db/seed.ts`
if (import.meta.url.endsWith(process.argv[1])) {
  seedFloors()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to seed floors:", err);
      process.exit(1);
    });
}
