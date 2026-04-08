import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  createCheckoutStateToken,
  verifyCheckoutStateToken,
} from "@/lib/checkout-state";

const ENV_KEYS = [
  "CHECKOUT_STATE_SECRET",
  "ADMIN_SESSION_SECRET",
  "STRIPE_SECRET_KEY",
  "PAYPAL_CLIENT_SECRET",
] as const;

const ORIGINAL_ENV = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]])
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

function restoreSecrets() {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV[key];
    if (typeof value === "string") {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
}

function clearSecrets() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

afterEach(() => {
  restoreSecrets();
});

test("createCheckoutStateToken fails closed when no signing secret is configured", () => {
  clearSecrets();

  assert.throws(
    () =>
      createCheckoutStateToken({
        items: [{ id: "11111111-1111-1111-1111-111111111111", qty: 1, price: 1200 }],
        shippingDetails: {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          shippingCountry: "DE",
          street: "Main Street",
          houseNumber: "1",
          postalCode: "10115",
          city: "Berlin",
          phoneNumber: "+49123456789",
          additionalInfo: "",
        },
      }),
    /CHECKOUT_STATE_SECRET/
  );
});

test("verifyCheckoutStateToken returns null when no signing secret is configured", () => {
  clearSecrets();

  assert.equal(verifyCheckoutStateToken("invalid.signature"), null);
});

test("checkout state tokens round-trip with an explicit signing secret", () => {
  clearSecrets();
  process.env.CHECKOUT_STATE_SECRET = "test-checkout-state-secret";

  const token = createCheckoutStateToken({
    items: [{ id: "22222222-2222-2222-2222-222222222222", qty: 2, price: 1500 }],
    shippingDetails: {
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      shippingCountry: "DE",
      street: "Second Street",
      houseNumber: "2A",
      postalCode: "10117",
      city: "Berlin",
      phoneNumber: "+49111111111",
      additionalInfo: "Doorbell Hopper",
    },
  });

  const parsed = verifyCheckoutStateToken(token);

  assert.ok(parsed);
  assert.equal(parsed?.shippingDetails.email, "grace@example.com");
  assert.equal(parsed?.items[0]?.qty, 2);
});
