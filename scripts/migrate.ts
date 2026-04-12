/**
 * Custom migration runner using the Neon HTTP driver.
 *
 * drizzle-kit migrate uses native TCP/WebSocket which doesn't work
 * reliably in Vercel build workers. This script uses the same HTTP
 * driver the app uses at runtime, making it safe to call from any
 * serverless/edge-adjacent build environment.
 *
 * Usage: npx tsx scripts/migrate.ts
 */
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is not set — skipping migrations");
  process.exit(0);
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

console.log("Running migrations…");
migrate(db, { migrationsFolder: "./db/migrations" })
  .then(() => {
    console.log("Migrations complete.");
  })
  .catch((err: unknown) => {
    console.error("Migration failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
