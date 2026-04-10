import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionCookie, verifyAdminPassword } from "@/lib/auth";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { db, schema } from "@/../db";
import { randomUUID } from "node:crypto";

function redirectWithError(req: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/admin/login?error=${error}`, req.url), 303);
}

async function logLoginAttempt(req: NextRequest, result: string) {
  try {
    await db().insert(schema.adminLoginLogs).values({
      id: randomUUID(),
      ip: getRequestIp(req),
      userAgent: req.headers.get("user-agent")?.substring(0, 512) ?? null,
      result,
    });
  } catch {
    // Never block login flow due to logging failure
  }
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const loginRateLimit = await rateLimit(
    `admin-login:${ip}`,
    5,
    15 * 60 * 1000
  );

  if (!loginRateLimit.success) {
    await logLoginAttempt(req, "rate_limited");
    const response = redirectWithError(req, "too-many-attempts");
    response.headers.set("Retry-After", String(loginRateLimit.retryAfterSeconds));
    return response;
  }

  const formData = await req.formData();
  const password = formData.get("password");

  if (typeof password !== "string" || password.trim().length === 0) {
    await logLoginAttempt(req, "missing_password");
    return redirectWithError(req, "missing-password");
  }

  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    await logLoginAttempt(req, "invalid_password");
    return redirectWithError(req, "invalid-password");
  }

  try {
    const session = createAdminSessionCookie();
    await logLoginAttempt(req, "success");
    const response = NextResponse.redirect(new URL("/admin", req.url), 303);
    response.cookies.set(session.name, session.value, session.options);
    return response;
  } catch {
    return redirectWithError(req, "auth-not-configured");
  }
}
