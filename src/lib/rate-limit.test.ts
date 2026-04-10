import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { NextRequest } from "next/server";
import { getRequestIp, rateLimit } from "./rate-limit";

const ENV_KEYS = ["DATABASE_URL", "TRUST_PROXY_HEADERS", "VERCEL", "VERCEL_ENV"] as const;

const ORIGINAL_ENV = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]])
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV[key];
    if (typeof value === "string") {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
}

function makeRequest(headers: Record<string, string>) {
  return new NextRequest("https://example.com", {
    headers,
  });
}

function uniqueRateLimitKey(scope: string): string {
  return `${scope}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

afterEach(() => {
  restoreEnv();
});

test("getRequestIp ignores spoofable proxy headers by default", () => {
  delete process.env.TRUST_PROXY_HEADERS;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;

  const request = makeRequest({
    "x-forwarded-for": "203.0.113.10, 198.51.100.9",
    "x-real-ip": "198.51.100.7",
  });

  assert.equal(getRequestIp(request), "unknown");
});

test("getRequestIp trusts Vercel forwarded headers", () => {
  process.env.VERCEL = "1";
  delete process.env.TRUST_PROXY_HEADERS;

  const request = makeRequest({
    "x-forwarded-for": "203.0.113.10, 198.51.100.9",
    "x-real-ip": "198.51.100.7",
  });

  assert.equal(getRequestIp(request), "203.0.113.10");
});

test("getRequestIp can trust self-hosted proxy headers when explicitly enabled", () => {
  process.env.TRUST_PROXY_HEADERS = "true";
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;

  const request = makeRequest({
    "x-forwarded-for": "203.0.113.10, 198.51.100.9",
  });

  assert.equal(getRequestIp(request), "203.0.113.10");
});

test("rateLimit blocks after the configured limit when database storage is unavailable", async () => {
  delete process.env.DATABASE_URL;

  const key = uniqueRateLimitKey("admin-login");

  const first = await rateLimit(key, 2, 1_000);
  const second = await rateLimit(key, 2, 1_000);
  const third = await rateLimit(key, 2, 1_000);

  assert.equal(first.success, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.success, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.success, false);
  assert.equal(third.remaining, 0);
  assert.ok(third.retryAfterSeconds >= 1);
});

test("rateLimit resets after the window expires in the in-memory fallback", async () => {
  delete process.env.DATABASE_URL;

  const key = uniqueRateLimitKey("admin-login-reset");

  await rateLimit(key, 1, 25);
  const blocked = await rateLimit(key, 1, 25);

  assert.equal(blocked.success, false);

  await new Promise((resolve) => setTimeout(resolve, 40));

  const reset = await rateLimit(key, 1, 25);

  assert.equal(reset.success, true);
  assert.equal(reset.remaining, 0);
});
