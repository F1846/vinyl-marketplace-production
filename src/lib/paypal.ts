import "server-only";

import { siteConfig } from "@/lib/site";

type PayPalOrderItem = {
  name: string;
  description?: string;
  unitAmountCents: number;
  quantity: number;
};

type PayPalLink = {
  href: string;
  rel: string;
  method?: string;
};

type PayPalCreateOrderResponse = {
  id: string;
  links?: PayPalLink[];
};

type PayPalCaptureResponse = {
  id: string;
  status: string;
  payer?: {
    email_address?: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
  purchase_units?: Array<{
    shipping?: {
      name?: {
        full_name?: string;
      };
      address?: {
        address_line_1?: string;
        address_line_2?: string;
        admin_area_1?: string;
        admin_area_2?: string;
        postal_code?: string;
        country_code?: string;
      };
    };
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
      }>;
    };
  }>;
};

function clean(value: string | undefined | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function paypalBaseUrl(): string {
  return process.env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function isPayPalConfigured(): boolean {
  return Boolean(clean(process.env.PAYPAL_CLIENT_ID) && clean(process.env.PAYPAL_CLIENT_SECRET));
}

function formatPayPalAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

async function getAccessToken(): Promise<string> {
  const clientId = clean(process.env.PAYPAL_CLIENT_ID);
  const clientSecret = clean(process.env.PAYPAL_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured.");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`PayPal token request failed with ${response.status}.`);
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("PayPal token response did not include an access token.");
  }

  return json.access_token;
}

type PayPalFetchInit = NonNullable<Parameters<typeof fetch>[1]>;

async function paypalFetch<T>(path: string, init: PayPalFetchInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`PayPal request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function createPayPalOrder(input: {
  items: PayPalOrderItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  returnUrl: string;
  cancelUrl: string;
  requestId: string;
}) {
  const response = await paypalFetch<PayPalCreateOrderResponse>("/v2/checkout/orders", {
    method: "POST",
    headers: {
      "PayPal-Request-Id": input.requestId,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "EUR",
            value: formatPayPalAmount(input.totalCents),
            breakdown: {
              item_total: {
                currency_code: "EUR",
                value: formatPayPalAmount(input.subtotalCents),
              },
              shipping: {
                currency_code: "EUR",
                value: formatPayPalAmount(input.shippingCents),
              },
            },
          },
          items: input.items.map((item) => ({
            name: item.name.slice(0, 127),
            description: item.description?.slice(0, 127),
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: "EUR",
              value: formatPayPalAmount(item.unitAmountCents),
            },
          })),
        },
      ],
      application_context: {
        brand_name: siteConfig.name,
        user_action: "PAY_NOW",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
  });

  const approveUrl = response.links?.find((link) => link.rel === "approve")?.href;
  if (!approveUrl) {
    throw new Error("PayPal approval link was not returned.");
  }

  return {
    id: response.id,
    approveUrl,
  };
}

export async function capturePayPalOrder(orderId: string) {
  return paypalFetch<PayPalCaptureResponse>(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "PayPal-Request-Id": orderId,
    },
    body: JSON.stringify({}),
  });
}
