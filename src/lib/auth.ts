import { compare } from "bcryptjs";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE_NAME = "federico_shop_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 5;

type AdminSessionPayload = {
  exp: number;
  nonce: string;
};

function getConfiguredPassword(): string | null {
  return process.env.ADMIN_PASSWORD?.trim() || null;
}

function getConfiguredPasswordHash(): string | null {
  return process.env.ADMIN_PASSWORD_HASH?.trim() || null;
}

function getAdminSessionSecret(): string | null {
  const dedicatedSecret = process.env.ADMIN_SESSION_SECRET?.trim() || null;
  if (dedicatedSecret) {
    return dedicatedSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return getConfiguredPasswordHash() || getConfiguredPassword();
  }

  return null;
}

function isAdminAuthConfigured(): boolean {
  return Boolean(getConfiguredPasswordHash() || getConfiguredPassword());
}

function encodePayload(payload: AdminSessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function createSessionToken(secret: string): string {
  const payload = encodePayload({
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString("hex"),
  });

  return `${payload}.${signPayload(payload, secret)}`;
}

function parseSessionToken(
  token: string,
  secret: string
): AdminSessionPayload | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload, secret);
  const providedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Partial<AdminSessionPayload>;

    if (
      typeof parsed.exp !== "number" ||
      typeof parsed.nonce !== "string" ||
      parsed.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      exp: parsed.exp,
      nonce: parsed.nonce,
    };
  } catch {
    return null;
  }
}

type AdminSessionCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict";
    expires: Date;
    path: string;
  };
};

function verifySessionToken(token: string, secret: string): boolean {
  return parseSessionToken(token, secret) !== null;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = getConfiguredPasswordHash();
  if (hash) {
    return compare(password, hash);
  }

  const envPassword = getConfiguredPassword();
  return envPassword ? password === envPassword : false;
}

export function createAdminSessionCookie(): AdminSessionCookie {
  const secret = getAdminSessionSecret();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET must be configured in production");
  }

  const sessionId = createSessionToken(secret);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000);

  return {
    name: ADMIN_COOKIE_NAME,
    value: sessionId,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: expiresAt,
      path: "/",
    },
  };
}

export async function createAdminSession(): Promise<string> {
  const session = createAdminSessionCookie();
  const cookieStore = await cookies();

  cookieStore.set(session.name, session.value, session.options);

  return session.value;
}

export async function isAuthenticatedAdmin(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production" && !isAdminAuthConfigured()) {
    return true;
  }

  const secret = getAdminSessionSecret();
  if (!secret) {
    return false;
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);

  return typeof session?.value === "string" && verifySessionToken(session.value, secret);
}

export async function getAdminSessionExpiryMs(): Promise<number | null> {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return null;
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);
  if (typeof session?.value !== "string") {
    return null;
  }

  const payload = parseSessionToken(session.value, secret);
  return payload ? payload.exp * 1000 : null;
}

export async function requireAuthenticatedAdmin(): Promise<void> {
  if (!(await isAuthenticatedAdmin())) {
    redirect("/admin/login");
  }
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}
