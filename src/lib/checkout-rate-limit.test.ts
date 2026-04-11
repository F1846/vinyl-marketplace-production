import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { NextRequest } from "next/server";
import {
  enforceCheckoutCompletionRateLimit,
  enforceCheckoutRateLimit,
} from "./checkout-rate-limit";

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

function makeRequest(ip: string) {
  return new NextRequest("https://example.com/api/checkout/create", {
    headers: {
      "x-forwarded-for": ip,
      "x-vercel-id": "test::fra1::abc123",
    },
  });
}

afterEach(() => {
  restoreEnv();
});

test("enforceCheckoutRateLimit blocks repeated checkout attempts from the same IP", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.TRUST_PROXY_HEADERS;
  process.env.VERCEL = "1";

  const requestIp = "203.0.113.10";
  let lastResult:
    | Awaited<ReturnType<typeof enforceCheckoutRateLimit>>
    | undefined;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    lastResult = await enforceCheckoutRateLimit(makeRequest(requestIp));
    assert.equal(lastResult.response, null);
  }

  assert.ok(lastResult);
  assert.equal(lastResult.headers["X-RateLimit-Limit"], "5");
  assert.equal(lastResult.headers["X-RateLimit-Remaining"], "0");

  const blocked = await enforceCheckoutRateLimit(makeRequest(requestIp));

  assert.equal(blocked.response?.status, 429);
  assert.equal(blocked.response?.headers.get("Retry-After"), blocked.headers["Retry-After"]);
  assert.equal(blocked.response?.headers.get("X-RateLimit-Limit"), "5");
  assert.equal(blocked.response?.headers.get("X-RateLimit-Remaining"), "0");
});

test("enforceCheckoutCompletionRateLimit uses a separate bucket from checkout creation", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.TRUST_PROXY_HEADERS;
  process.env.VERCEL = "1";

  const requestIp = "203.0.113.11";

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const createResult = await enforceCheckoutRateLimit(makeRequest(requestIp));
    assert.equal(createResult.response, null);
  }

  const createBlocked = await enforceCheckoutRateLimit(makeRequest(requestIp));
  assert.equal(createBlocked.response?.status, 429);

  const completionResult = await enforceCheckoutCompletionRateLimit(makeRequest(requestIp));
  assert.equal(completionResult.response, null);
  assert.equal(completionResult.headers["X-RateLimit-Limit"], "5");
  assert.equal(completionResult.headers["X-RateLimit-Remaining"], "4");
});
