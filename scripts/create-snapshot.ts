import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "fs";
import path from "path";
import { db } from "../lib/db/config/client";
import { sql } from "drizzle-orm";

async function createDatabaseSnapshot() {
  console.log("==================================================");
  console.log("📦 STARTING FULL DATABASE SNAPSHOT");
  console.log("==================================================");

  // 1. Fetch all table names in public schema
  const tablesRes = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tablesRes.rows.map((r: any) => r.table_name);
  console.log(`Found ${tables.length} tables in database:`, tables.join(", "));

  const snapshot: {
    timestamp: string;
    summary: Record<string, number>;
    tables: Record<string, any[]>;
  } = {
    timestamp: new Date().toISOString(),
    summary: {},
    tables: {},
  };

  let totalRows = 0;

  for (const table of tables) {
    try {
      const res = await db.execute(sql.raw(`SELECT * FROM "${table}";`));
      snapshot.tables[table] = res.rows;
      snapshot.summary[table] = res.rows.length;
      totalRows += res.rows.length;
      console.log(`  ✓ Backed up [${table}]: ${res.rows.length} rows`);
    } catch (err: any) {
      console.error(`  ✗ Error backing up [${table}]:`, err.message);
      snapshot.tables[table] = [];
      snapshot.summary[table] = -1;
    }
  }

  const snapshotsDir = path.join(process.cwd(), "snapshots");
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }

  const filename = `db-snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const targetPath = path.join(snapshotsDir, filename);
  const latestPath = path.join(snapshotsDir, "latest-snapshot.json");

  const jsonContent = JSON.stringify(snapshot, null, 2);
  fs.writeFileSync(targetPath, jsonContent, "utf8");
  fs.writeFileSync(latestPath, jsonContent, "utf8");

  console.log("==================================================");
  console.log(`✅ Snapshot successfully created!`);
  console.log(`📁 File: ${targetPath}`);
  console.log(`📁 Latest alias: ${latestPath}`);
  console.log(`📊 Total rows backed up: ${totalRows}`);
  console.log("==================================================");

  process.exit(0);
}

createDatabaseSnapshot().catch((err) => {
  console.error("FATAL: Failed to create database snapshot:", err);
  process.exit(1);
});
