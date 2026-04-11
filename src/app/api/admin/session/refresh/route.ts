import { NextResponse } from "next/server";
import {
  createAdminSessionCookie,
  isAuthenticatedAdmin,
} from "@/lib/auth";

export async function POST() {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json(
      { ok: false },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    const session = createAdminSessionCookie();
    const response = NextResponse.json(
      {
        ok: true,
        expiresAt: session.options.expires.getTime(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

    response.cookies.set(session.name, session.value, session.options);
    return response;
  } catch (err) {
    // Session secret is not configured — tell the client the refresh failed
    // so it can prompt for re-authentication rather than assuming success.
    console.error("Admin session refresh failed:", err);
    return NextResponse.json(
      { ok: false },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
