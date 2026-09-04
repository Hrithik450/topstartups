import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { db } from "../lib/db/config/client";
import { sql } from "drizzle-orm";

async function dropLegacyColumns() {
  console.log("==================================================");
  console.log("🧹 DROPPING UNUSED LEGACY COLUMNS FROM DATABASE");
  console.log("==================================================");

  await db.execute(sql`
    UPDATE "floors" SET "company_name" = LOWER("company_name");
    UPDATE "claims" SET "company_name" = LOWER("company_name");
  `);
  console.log("✅ company_name updated to lowercase in floors and claims");

  const floorsRes = await db.execute(sql`SELECT id, company_name, company_url, price_paid FROM "floors" ORDER BY price_paid DESC;`);
  console.log(`\n📊 Live Floors:`);
  console.table(floorsRes.rows);
  process.exit(0);
}

dropLegacyColumns().catch((err) => {
  console.error("❌ Failed to drop legacy columns:", err);
  process.exit(1);
});
