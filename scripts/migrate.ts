/**
 * Custom SQL migration runner using the Neon HTTP driver.
 *
 * Migrations are plain .sql files in db/migrations/ (no drizzle-kit journal).
 * Applied migrations are tracked in a _migrations table so each file runs
 * exactly once.  Safe to call on every Vercel deploy.
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

/**
 * Split a SQL file into individual statements.
 * Handles -- line comments, /* block comments *\/, dollar-quoted strings,
 * and single-quoted strings so semicolons inside them are not treated as
 * statement terminators.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;

  while (i < sql.length) {
    // Line comment — skip to end of line
    if (sql[i] === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }

    // Block comment — skip to */
    if (sql[i] === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    // Dollar-quoted string — $tag$...$tag$
    if (sql[i] === "$") {
      const tagEnd = sql.indexOf("$", i + 1);
      if (tagEnd !== -1) {
        const tag = sql.slice(i, tagEnd + 1);
        const closeTag = sql.indexOf(tag, tagEnd + 1);
        if (closeTag !== -1) {
          current += sql.slice(i, closeTag + tag.length);
          i = closeTag + tag.length;
          continue;
        }
      }
    }

    // Single-quoted string — handle '' escapes
    if (sql[i] === "'") {
      current += sql[i++];
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          current += "''";
          i += 2;
        } else if (sql[i] === "'") {
          current += sql[i++];
          break;
        } else {
          current += sql[i++];
        }
      }
      continue;
    }

    // Statement terminator
    if (sql[i] === ";") {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = "";
      i++;
      continue;
    }

    current += sql[i++];
  }

  const trailing = current.trim();
  if (trailing) statements.push(trailing);

  return statements;
}

async function run() {
  const sql = neon(databaseUrl as string);

  // Helper to run a raw SQL string (no parameters) via the neon HTTP client.
  // Neon's tagged-template function reads strings[0] as the query text.
  // We build a proper TemplateStringsArray-shaped object (with .raw) so the
  // driver doesn't throw on internal checks.
  const exec = (stmt: string) => {
    const tag = Object.assign([stmt], { raw: [stmt] }) as TemplateStringsArray;
    return sql(tag);
  };

  // Ensure migration tracking table exists
  await exec(
    "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
  );

  // Find all *.sql files sorted alphabetically
  const migrationsDir = join(process.cwd(), "db", "migrations");
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Which migrations have already been applied?
  const applied = await sql`SELECT name FROM _migrations`;
  const appliedSet = new Set(applied.map((r) => r.name as string));

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const content = await readFile(join(migrationsDir, file), "utf8");
    const statements = splitStatements(content);

    console.log(`  applying ${file} (${statements.length} statement(s))…`);

    // Execute each statement individually — Neon HTTP rejects multi-command
    // prepared statements, so we must send them one at a time.
    for (const stmt of statements) {
      await exec(stmt);
    }

    await sql`INSERT INTO _migrations (name) VALUES (${file})`;
    count += 1;
  }

  console.log(count === 0 ? "No new migrations." : `Applied ${count} migration(s).`);
}

run().catch((err: unknown) => {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
