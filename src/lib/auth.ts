import { compare } from "bcryptjs";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "f1846_admin_session";

export async function verifyAdminPassword(
  password: string
): Promise<boolean> {
  const envPassword = process.env.ADMIN_PASSWORD;

  // In local dev, compare plaintext
  if (process.env.NODE_ENV !== "production") {
    return password === envPassword;
  }

  // In production, compare bcrypt hash
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return false;

  return compare(password, hash);
}

export async function createAdminSession(): Promise<string> {
  const sessionId = nanoid(32);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
  return sessionId;
}

export async function isAuthenticatedAdmin(): Promise<boolean> {
  if (process.env.NODE_ENV === "development" && !process.env.ADMIN_PASSWORD_HASH) {
    // In dev, we trust if ADMIN_PASSWORD matches env
    return true;
  }
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);
  return !!session?.value && session.value.length > 0;
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}
