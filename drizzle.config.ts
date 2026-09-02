import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_DIRECT_URL ||
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@127.0.0.1:5432/outbid",
  },
  verbose: true,
  strict: true,
});
