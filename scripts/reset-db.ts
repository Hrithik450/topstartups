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
    console.log("1. Resetting floors, claims, users, active sessions, and countries...");
    await pool.query(`DELETE FROM floors;`);
    await pool.query(`DELETE FROM claims;`);
    await pool.query(`DELETE FROM users;`);
    await pool.query(`DELETE FROM active_sessions;`);
    await pool.query(`DELETE FROM visitor_countries;`);
    
    console.log("2. Resetting site stats...");
    await pool.query(`
      INSERT INTO site_stats (key, total_views, updated_at)
      VALUES ('global', 1, NOW())
      ON CONFLICT (key) DO UPDATE SET total_views = 1, updated_at = NOW();
    `);

    console.log("3. Resetting 50 skyscraper floors to pristine mock state...");
    await pool.query(`DELETE FROM floors;`);

    for (let rank = 1; rank <= 50; rank++) {
      const price = 50;
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
    console.log(`✓ Database Reset Complete!`);
    console.log(`- Pristine Mock Floors: ${countRes.rows[0].cnt} / 50`);
    console.log(`- Claimed Floors: 0`);
    console.log(`- Test Users: ${usersRes.rows[0].cnt}`);
    console.log(`- Test Claims: ${claimsRes.rows[0].cnt}`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error("Error resetting database:", err);
  } finally {
    await pool.end();
  }
}

resetDb();
