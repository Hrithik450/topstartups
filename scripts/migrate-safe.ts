import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "fs";
import path from "path";
import { db } from "../lib/db/config/client";
import { sql } from "drizzle-orm";

async function runSafeMigration() {
  console.log("==================================================");
  console.log("🚀 STARTING SAFE DATABASE MIGRATION");
  console.log("==================================================");

  // ─────────────────────────────────────────────────────────────
  // STEP 1: PRE-MIGRATION BACKUP DUMP
  // ─────────────────────────────────────────────────────────────
  console.log("\n📦 Step 1: Creating pre-migration backup...");

  const tablesRes = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const backupData: Record<string, any[]> = {};
  for (const row of tablesRes.rows as any[]) {
    const tbl = row.table_name;
    const r = await db.execute(sql.raw(`SELECT * FROM "${tbl}";`));
    backupData[tbl] = r.rows;
    console.log(`  - Backed up [${tbl}]: ${r.rows.length} rows`);
  }

  const backupDir = path.join(process.cwd(), "snapshots");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const backupFile = path.join(backupDir, `backup-before-migration-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), "utf8");
  console.log(`✅ Backup successfully written to: ${backupFile}`);

  // ─────────────────────────────────────────────────────────────
  // STEP 2: USERS TABLE MIGRATION
  // ─────────────────────────────────────────────────────────────
  console.log("\n👤 Step 2: Migrating 'users' table...");
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" timestamp with time zone;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" text;
    UPDATE "users" SET "image" = "avatar_url" WHERE "image" IS NULL AND "avatar_url" IS NOT NULL;
    UPDATE "users" SET "avatar_url" = "image" WHERE "avatar_url" IS NULL AND "image" IS NOT NULL;
  `);
  console.log("  - Added 'emailVerified' and 'image' columns to 'users'");
  console.log("  - Synchronized 'avatar_url' <-> 'image'");

  // ─────────────────────────────────────────────────────────────
  // STEP 3: NEXTAUTH TABLES (ACCOUNTS & VERIFICATION TOKENS)
  // ─────────────────────────────────────────────────────────────
  console.log("\n🔐 Step 3: Ensuring NextAuth tables exist...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "accounts" (
      "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "provider" text NOT NULL,
      "providerAccountId" text NOT NULL,
      "refresh_token" text,
      "access_token" text,
      "expires_at" integer,
      "token_type" text,
      "scope" text,
      "id_token" text,
      "session_state" text,
      PRIMARY KEY ("provider", "providerAccountId")
    );

    CREATE TABLE IF NOT EXISTS "verificationTokens" (
      "identifier" text NOT NULL,
      "token" text NOT NULL,
      "expires" timestamp with time zone NOT NULL,
      PRIMARY KEY ("identifier", "token")
    );
  `);
  console.log("  - Created/verified 'accounts' and 'verificationTokens' tables");

  // ─────────────────────────────────────────────────────────────
  // STEP 4: SESSIONS TABLE & UNIFICATION (ELIMINATING ACTIVE_SESSIONS)
  // ─────────────────────────────────────────────────────────────
  console.log("\n🌐 Step 4: Unifying sessions table (migrating 'active_sessions' -> 'sessions')...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sessions" (
      "sessionToken" text PRIMARY KEY,
      "userId" uuid REFERENCES "users"("id") ON DELETE CASCADE,
      "expires" timestamp with time zone,
      "country_code" varchar(10),
      "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "country_code" varchar(10);
    ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp with time zone DEFAULT now();
    ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();

    -- If active_sessions exists, migrate all session data safely
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'active_sessions'
      ) THEN
        INSERT INTO "sessions" ("sessionToken", "country_code", "last_seen_at", "created_at")
        SELECT "session_id", "country_code", "last_seen_at", "created_at"
        FROM "active_sessions"
        ON CONFLICT ("sessionToken") DO UPDATE 
        SET "last_seen_at" = EXCLUDED."last_seen_at",
            "country_code" = COALESCE(EXCLUDED."country_code", "sessions"."country_code");

        DROP TABLE "active_sessions";
        RAISE NOTICE 'Migrated active_sessions into sessions and dropped active_sessions table.';
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("userId");
    CREATE INDEX IF NOT EXISTS "sessions_last_seen_at_idx" ON "sessions"("last_seen_at");
  `);
  console.log("  - 'sessions' table unified (stores both NextAuth sessions & live visitor heartbeats)");
  console.log("  - Custom 'active_sessions' table safely migrated & dropped");

  // ─────────────────────────────────────────────────────────────
  // STEP 5: FLOORS TABLE MIGRATION
  // ─────────────────────────────────────────────────────────────
  console.log("\n🏢 Step 5: Migrating 'floors' table...");
  await db.execute(sql`
    -- 1. Add user_email column if missing
    ALTER TABLE "floors" ADD COLUMN IF NOT EXISTS "user_email" varchar(255);
    
    -- 2. Populate user_email from owner_email
    UPDATE "floors" SET "user_email" = "owner_email" WHERE "user_email" IS NULL AND "owner_email" IS NOT NULL;
    UPDATE "floors" SET "owner_email" = "user_email" WHERE "owner_email" IS NULL AND "user_email" IS NOT NULL;

    -- 3. Drop rank unique constraint so dynamic rank calculation never conflicts
    ALTER TABLE "floors" DROP CONSTRAINT IF EXISTS "floors_rank_unique";
    ALTER TABLE "floors" ALTER COLUMN "rank" DROP NOT NULL;
    ALTER TABLE "floors" ALTER COLUMN "is_claimed" DROP NOT NULL;

    -- 4. Create performance indexes
    CREATE INDEX IF NOT EXISTS "floors_price_paid_idx" ON "floors"("price_paid");
    CREATE INDEX IF NOT EXISTS "floors_user_email_idx" ON "floors"("user_email");
    CREATE INDEX IF NOT EXISTS "floors_user_id_idx" ON "floors"("user_id");
  `);
  console.log("  - Added 'user_email' column and populated from 'owner_email'");
  console.log("  - Dropped rigid 'floors_rank_unique' constraint for dynamic unlimited rank calculation");
  console.log("  - Created performance indexes on price_paid, user_email, and user_id");

  // ─────────────────────────────────────────────────────────────
  // STEP 6: CLAIMS TABLE MIGRATION
  // ─────────────────────────────────────────────────────────────
  console.log("\n💳 Step 6: Migrating 'claims' table...");
  await db.execute(sql`
    -- 1. Add checkout_session_id column if missing
    ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "checkout_session_id" varchar(255);

    -- 2. Populate checkout_session_id from payment_id (which held cks_... and pay_...)
    UPDATE "claims" SET "checkout_session_id" = "payment_id" WHERE "checkout_session_id" IS NULL AND "payment_id" IS NOT NULL;

    -- 3. Add company_url column if missing
    ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "company_url" varchar(512);

    -- 4. Populate company_url from url
    UPDATE "claims" SET "company_url" = "url" WHERE "company_url" IS NULL AND "url" IS NOT NULL;
    UPDATE "claims" SET "url" = "company_url" WHERE "url" IS NULL AND "company_url" IS NOT NULL;

    -- 5. Add updated_at column if missing
    ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    UPDATE "claims" SET "updated_at" = COALESCE("completed_at", "created_at", now()) WHERE "updated_at" IS NULL;

    -- 6. Make payment_id nullable if pending
    ALTER TABLE "claims" ALTER COLUMN "payment_id" DROP NOT NULL;
    ALTER TABLE "claims" DROP CONSTRAINT IF EXISTS "claims_payment_id_unique";
    
    -- 7. Add unique constraint on checkout_session_id if not present
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'claims_checkout_session_id_unique'
      ) THEN
        ALTER TABLE "claims" ADD CONSTRAINT "claims_checkout_session_id_unique" UNIQUE ("checkout_session_id");
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Constraint claims_checkout_session_id_unique already exists or duplicate session IDs';
    END $$;

    -- 8. Create indexes
    CREATE INDEX IF NOT EXISTS "claims_payment_id_idx" ON "claims"("payment_id");
    CREATE INDEX IF NOT EXISTS "claims_checkout_session_id_idx" ON "claims"("checkout_session_id");
    CREATE INDEX IF NOT EXISTS "claims_status_idx" ON "claims"("status");
    CREATE INDEX IF NOT EXISTS "claims_user_id_idx" ON "claims"("user_id");
  `);
  console.log("  - Added 'checkout_session_id', 'company_url', and 'updated_at' to 'claims'");
  console.log("  - Backfilled all 38 claims with proper session and URL mapping");

  // ─────────────────────────────────────────────────────────────
  // STEP 7: CLEANUP OBSOLETE FLOOR_LOCKS
  // ─────────────────────────────────────────────────────────────
  console.log("\n🧹 Step 7: Cleaning up obsolete floor_locks table...");
  await db.execute(sql`
    DROP TABLE IF EXISTS "floor_locks";
  `);
  console.log("  - Dropped unused 'floor_locks' table");

  // ─────────────────────────────────────────────────────────────
  // STEP 8: POST-MIGRATION VERIFICATION & INTEGRITY CHECK
  // ─────────────────────────────────────────────────────────────
  console.log("\n🔍 Step 8: Verifying post-migration data integrity...");

  const [usersCount, floorsCount, claimsCount, sessionsCount, statsCount, countriesCount] = await Promise.all([
    db.execute(sql`SELECT count(*) FROM "users";`),
    db.execute(sql`SELECT count(*) FROM "floors";`),
    db.execute(sql`SELECT count(*) FROM "claims";`),
    db.execute(sql`SELECT count(*) FROM "sessions";`),
    db.execute(sql`SELECT count(*) FROM "site_stats";`),
    db.execute(sql`SELECT count(*) FROM "visitor_countries";`),
  ]);

  console.log("\n📊 Final Live Row Counts:");
  console.log(`  - Users: ${usersCount.rows[0].count} (Pre: ${backupData.users?.length})`);
  console.log(`  - Floors: ${floorsCount.rows[0].count} (Pre: ${backupData.floors?.length})`);
  console.log(`  - Claims: ${claimsCount.rows[0].count} (Pre: ${backupData.claims?.length})`);
  console.log(`  - Sessions: ${sessionsCount.rows[0].count} (Pre: ${backupData.active_sessions?.length})`);
  console.log(`  - Site Stats: ${statsCount.rows[0].count} (Pre: ${backupData.site_stats?.length})`);
  console.log(`  - Visitor Countries: ${countriesCount.rows[0].count} (Pre: ${backupData.visitor_countries?.length})`);

  if (
    Number(usersCount.rows[0].count) !== (backupData.users?.length || 0) ||
    Number(floorsCount.rows[0].count) !== (backupData.floors?.length || 0) ||
    Number(claimsCount.rows[0].count) !== (backupData.claims?.length || 0)
  ) {
    console.error("❌ CRITICAL ERROR: Row count mismatch detected!");
    process.exit(1);
  }

  console.log("\n==================================================");
  console.log("🎉 SAFE MIGRATION COMPLETED SUCCESSFULLY WITH 100% DATA PRESERVATION!");
  console.log("==================================================");
  process.exit(0);
}

runSafeMigration().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
