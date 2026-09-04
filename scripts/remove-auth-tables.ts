import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "fs";
import path from "path";
import { db } from "../lib/db/config/client";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("==================================================");
  console.log("🛡️  SAFELY MIGRATING DATABASE: REMOVING AUTH TABLES");
  console.log("==================================================");

  // 1. Snapshot all tables before making changes
  console.log("\n📦 1. Creating pre-migration snapshot...");
  const tablesRes = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const snapshot: Record<string, any[]> = {};
  for (const row of tablesRes.rows as any[]) {
    const tbl = row.table_name;
    const r = await db.execute(sql.raw(`SELECT * FROM "${tbl}";`));
    snapshot[tbl] = r.rows;
    console.log(`  - Backed up [${tbl}]: ${r.rows.length} rows`);
  }

  const snapshotDir = path.join(process.cwd(), "snapshots");
  if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });

  const backupFile = path.join(snapshotDir, `db-snapshot-before-auth-removal-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`✅ Snapshot saved to ${backupFile}`);

  // 2. Run Migration in a Transaction
  console.log("\n🚀 2. Executing safe migration queries...");
  await db.transaction(async (tx) => {
    // Drop FK constraints
    console.log("  - Dropping foreign key constraints...");
    await tx.execute(sql`ALTER TABLE "floors" DROP CONSTRAINT IF EXISTS "floors_user_id_fkey";`);
    await tx.execute(sql`ALTER TABLE "claims" DROP CONSTRAINT IF EXISTS "claims_user_id_fkey";`);
    await tx.execute(sql`ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_userId_fkey";`);
    await tx.execute(sql`ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_userId_fkey";`);

    // Drop indexes on user_id
    console.log("  - Dropping user_id indexes...");
    await tx.execute(sql`DROP INDEX IF EXISTS "floors_user_id_idx";`);
    await tx.execute(sql`DROP INDEX IF EXISTS "claims_user_id_idx";`);
    await tx.execute(sql`DROP INDEX IF EXISTS "sessions_user_id_idx";`);

    // Drop user_id columns
    console.log("  - Dropping user_id columns from floors, claims, sessions...");
    await tx.execute(sql`ALTER TABLE "floors" DROP COLUMN IF EXISTS "user_id";`);
    await tx.execute(sql`ALTER TABLE "claims" DROP COLUMN IF EXISTS "user_id";`);
    await tx.execute(sql`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "userId";`);

    // Drop auth tables
    console.log("  - Dropping auth tables: accounts, verificationTokens, users...");
    await tx.execute(sql`DROP TABLE IF EXISTS "accounts" CASCADE;`);
    await tx.execute(sql`DROP TABLE IF EXISTS "verificationTokens" CASCADE;`);
    await tx.execute(sql`DROP TABLE IF EXISTS "users" CASCADE;`);
  });

  console.log("\n🔍 3. Verifying remaining public tables...");
  const remainingRes = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log("Remaining tables:", remainingRes.rows.map((r: any) => r.table_name));

  console.log("\n🎉 Safe migration completed successfully!");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
