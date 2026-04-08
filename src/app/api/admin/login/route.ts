import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionCookie, verifyAdminPassword } from "@/lib/auth";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";

function redirectWithError(req: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/admin/login?error=${error}`, req.url), 303);
}

export async function POST(req: NextRequest) {
  const loginRateLimit = rateLimit(
    `admin-login:${getRequestIp(req)}`,
    5,
    15 * 60 * 1000
  );

  if (!loginRateLimit.success) {
    const response = redirectWithError(req, "too-many-attempts");
    response.headers.set("Retry-After", String(loginRateLimit.retryAfterSeconds));
    return response;
  }

  const formData = await req.formData();
  const password = formData.get("password");

  if (typeof password !== "string" || password.trim().length === 0) {
    return redirectWithError(req, "missing-password");
  }

  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    return redirectWithError(req, "invalid-password");
  }

  try {
    const session = createAdminSessionCookie();
    const response = NextResponse.redirect(new URL("/admin", req.url), 303);

    response.cookies.set(session.name, session.value, session.options);

    return response;
  } catch {
    return redirectWithError(req, "auth-not-configured");
  }
}
