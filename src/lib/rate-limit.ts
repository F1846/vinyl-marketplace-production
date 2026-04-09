import type { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

const RATE_LIMIT_STORE_SYMBOL = Symbol.for("federico-shop.rate-limit-store");

function getStore(): Map<string, RateLimitEntry> {
  const globalStore = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_SYMBOL]?: Map<string, RateLimitEntry>;
  };

  if (!globalStore[RATE_LIMIT_STORE_SYMBOL]) {
    globalStore[RATE_LIMIT_STORE_SYMBOL] = new Map<string, RateLimitEntry>();
  }

  return globalStore[RATE_LIMIT_STORE_SYMBOL];
}

function cleanupExpiredEntries(store: Map<string, RateLimitEntry>, now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

function rateLimitInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  cleanupExpiredEntries(store, now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      success: true,
      limit,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    success: true,
    limit,
    remaining: Math.max(limit - existing.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
  };
}

function toResetDate(value: unknown, fallback: number): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date(fallback);
}

function toCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) ? count : 1;
}

function isMissingRateLimitTable(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('relation "rate_limits" does not exist') ||
    error.message.includes('table "rate_limits" does not exist')
  );
}

async function rateLimitInDatabase(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = new Date(now + windowMs);
  const result = await db().execute(sql`
    WITH existing AS (
      SELECT count, reset_at
      FROM rate_limits
      WHERE bucket_key = ${key}
    ),
    inserted AS (
      INSERT INTO rate_limits (bucket_key, count, reset_at, created_at, updated_at)
      SELECT ${key}, 1, ${resetAt}, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM existing)
      ON CONFLICT (bucket_key) DO NOTHING
      RETURNING count, reset_at, true AS success
    ),
    updated AS (
      UPDATE rate_limits
      SET
        count = CASE
          WHEN rate_limits.reset_at <= now() THEN 1
          WHEN rate_limits.count < ${limit} THEN rate_limits.count + 1
          ELSE rate_limits.count
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at <= now() THEN ${resetAt}
          ELSE rate_limits.reset_at
        END,
        updated_at = now()
      WHERE bucket_key = ${key}
        AND EXISTS (SELECT 1 FROM existing)
      RETURNING
        count,
        reset_at,
        CASE
          WHEN (SELECT reset_at <= now() FROM existing) THEN true
          WHEN (SELECT count < ${limit} FROM existing) THEN true
          ELSE false
        END AS success
    )
    SELECT count, reset_at, success FROM inserted
    UNION ALL
    SELECT count, reset_at, success FROM updated
    LIMIT 1
  `);

  const row = result.rows[0] as
    | { count?: unknown; reset_at?: unknown; success?: unknown }
    | undefined;

  if (!row) {
    return rateLimitInMemory(key, limit, windowMs);
  }

  const count = toCount(row.count);
  const expiresAt = toResetDate(row.reset_at, now + windowMs).getTime();
  const success = Boolean(row.success);

  return {
    success,
    limit,
    remaining: success ? Math.max(limit - count, 0) : 0,
    retryAfterSeconds: Math.max(Math.ceil((expiresAt - now) / 1000), 1),
  };
}

function cleanHeaderValue(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isTruthyEnvFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function trustProxyHeaders(request: NextRequest): boolean {
  if (isTruthyEnvFlag(process.env.TRUST_PROXY_HEADERS)) {
    return true;
  }

  return Boolean(
    cleanHeaderValue(process.env.VERCEL) ||
      cleanHeaderValue(process.env.VERCEL_ENV) ||
      cleanHeaderValue(request.headers.get("x-vercel-id"))
  );
}

export function getRequestIp(request: NextRequest): string {
  if (!trustProxyHeaders(request)) {
    return "unknown";
  }

  const forwardedFor = cleanHeaderValue(request.headers.get("x-forwarded-for"));
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = cleanHeaderValue(request.headers.get("x-real-ip"));
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!process.env.DATABASE_URL) {
    return rateLimitInMemory(key, limit, windowMs);
  }

  try {
    return await rateLimitInDatabase(key, limit, windowMs);
  } catch (error) {
    if (isMissingRateLimitTable(error)) {
      console.warn("rate_limits table is missing; falling back to in-memory rate limiting.");
      return rateLimitInMemory(key, limit, windowMs);
    }

    throw error;
  }
}
