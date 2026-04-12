/**
 * Custom SQL migration runner using the Neon HTTP driver.
 *
 * Migrations are plain .sql files in db/migrations/ (no drizzle-kit journal).
 * Applied migrations are tracked in a _migrations table so each file runs
 * exactly once.  Safe to call on every Vercel deploy — already-applied
 * migrations are skipped.
 *
 * Usage: npx tsx scripts/migrate.ts
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log("DATABASE_URL is not set — skipping migrations");
  process.exit(0);
}

async function run() {
  const sql = neon(databaseUrl as string);

  // Create tracking table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Find all migration files, sorted alphabetically
  const migrationsDir = join(process.cwd(), "db", "migrations");
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Fetch already-applied migrations
  const applied = await sql`SELECT name FROM _migrations`;
  const appliedSet = new Set(applied.map((r) => r.name as string));

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      continue;
    }

    const filePath = join(migrationsDir, file);
    const content = await readFile(filePath, "utf8");

    console.log(`  applying ${file}…`);
    await sql.transaction((tx) => [
      tx(content),
      tx`INSERT INTO _migrations (name) VALUES (${file})`,
    ]);
    count += 1;
  }

  if (count === 0) {
    console.log("No new migrations to apply.");
  } else {
    console.log(`Applied ${count} migration(s).`);
  }
}

run().catch((err: unknown) => {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
