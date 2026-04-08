import { compare } from "bcryptjs";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE_NAME = "federico_shop_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24;

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
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    getConfiguredPasswordHash() ||
    getConfiguredPassword()
  );
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

function verifySessionToken(token: string, secret: string): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(payload, secret);
  const providedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Partial<AdminSessionPayload>;

    return typeof parsed.exp === "number" && parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = getConfiguredPasswordHash();
  if (hash) {
    return compare(password, hash);
  }

  const envPassword = getConfiguredPassword();
  return envPassword ? password === envPassword : false;
}

export async function createAdminSession(): Promise<string> {
  const secret = getAdminSessionSecret();
  if (!secret) {
    throw new Error("Admin session secret is not configured");
  }

  const sessionId = createSessionToken(secret);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000);
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });

  return sessionId;
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

export async function requireAuthenticatedAdmin(): Promise<void> {
  if (!(await isAuthenticatedAdmin())) {
    redirect("/admin/login");
  }
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}
