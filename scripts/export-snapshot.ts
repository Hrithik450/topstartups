import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "fs";
import path from "path";
import { db } from "../lib/db/config/client";
import { sql } from "drizzle-orm";

async function exportSnapshot() {
  console.log("Fetching database schema and raw tables...");

  const tablesRes = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log("\nExisting Tables:", tablesRes.rows.map((r: any) => r.table_name));

  for (const tableRow of tablesRes.rows as any[]) {
    const tableName = tableRow.table_name;
    const colsRes = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position;
    `);
    console.log(`\n=== Table: ${tableName} ===`);
    console.log("Columns:", colsRes.rows.map((c: any) => `${c.column_name} (${c.data_type})`).join(", "));

    try {
      const dataRes = await db.execute(sql.raw(`SELECT * FROM "${tableName}" LIMIT 10;`));
      console.log(`Row count (sample max 10): ${dataRes.rows.length}`);
      if (dataRes.rows.length > 0) {
        console.log("Sample row:", JSON.stringify(dataRes.rows[0], null, 2));
      }
    } catch (err: any) {
      console.warn(`Could not select from ${tableName}:`, err.message);
    }
  }

  process.exit(0);
}

exportSnapshot().catch((err) => {
  console.error("Failed to export database snapshot:", err);
  process.exit(1);
});
