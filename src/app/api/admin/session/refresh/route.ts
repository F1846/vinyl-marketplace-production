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
  } catch {
    return NextResponse.json(
      { ok: true },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
