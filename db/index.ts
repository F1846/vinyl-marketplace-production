import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const client = neon(process.env.DATABASE_URL ?? "");

let _db: NeonHttpDatabase<typeof schema> | null = null;

export function db() {
  if (!_db) {
    _db = drizzle(client, { schema });
  }
  return _db;
}

export { schema };
