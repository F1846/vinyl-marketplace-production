import { createHmac, timingSafeEqual } from "node:crypto";
import type { CheckoutCartItem } from "@/lib/checkout";
import type { ShippingDetailsInput } from "@/validations/checkout";

type CheckoutStatePayload = {
  items: CheckoutCartItem[];
  shippingDetails: ShippingDetailsInput;
  createdAt: number;
};

function clean(value: string | undefined | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isShippingDetails(value: unknown): value is ShippingDetailsInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const requiredKeys = [
    "firstName",
    "lastName",
    "email",
    "shippingCountry",
    "street",
    "houseNumber",
    "postalCode",
    "city",
    "phoneNumber",
  ] as const;

  return requiredKeys.every((key) => typeof candidate[key] === "string");
}

export function isCheckoutStateConfigured(): boolean {
  return Boolean(
    clean(process.env.CHECKOUT_STATE_SECRET) ||
      clean(process.env.ADMIN_SESSION_SECRET) ||
      process.env.NODE_ENV !== "production"
  );
}

function getCheckoutStateSecret(): string {
  const dedicatedSecret = clean(process.env.CHECKOUT_STATE_SECRET);
  if (dedicatedSecret) {
    return dedicatedSecret;
  }

  const adminSessionSecret = clean(process.env.ADMIN_SESSION_SECRET);
  if (adminSessionSecret) {
    return adminSessionSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "federico-shop-dev-checkout-state-secret";
  }

  throw new Error(
    "CHECKOUT_STATE_SECRET or ADMIN_SESSION_SECRET must be configured in production."
  );
}

function signPayload(payload: string): string {
  return createHmac("sha256", getCheckoutStateSecret()).update(payload).digest("hex");
}

export function createCheckoutStateToken(input: {
  items: CheckoutCartItem[];
  shippingDetails: ShippingDetailsInput;
}): string {
  const payload = Buffer.from(
    JSON.stringify({
      items: input.items,
      shippingDetails: input.shippingDetails,
      createdAt: Date.now(),
    } satisfies CheckoutStatePayload)
  ).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
}

export function verifyCheckoutStateToken(token: string): CheckoutStatePayload | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  let expected: string;
  try {
    expected = signPayload(payload);
  } catch {
    return null;
  }

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as CheckoutStatePayload;

    if (!Array.isArray(parsed.items) || !isShippingDetails(parsed.shippingDetails) || typeof parsed.createdAt !== "number") {
      return null;
    }

    if (Date.now() - parsed.createdAt > 1000 * 60 * 60 * 6) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
