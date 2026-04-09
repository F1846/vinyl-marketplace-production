import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { NextRequest } from "next/server";
import { getRequestIp } from "./rate-limit";

const ENV_KEYS = ["TRUST_PROXY_HEADERS", "VERCEL", "VERCEL_ENV"] as const;

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
