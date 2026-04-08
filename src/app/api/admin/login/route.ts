import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionCookie, verifyAdminPassword } from "@/lib/auth";

function redirectWithError(req: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/admin/login?error=${error}`, req.url), 303);
}

export async function POST(req: NextRequest) {
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
