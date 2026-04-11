import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import {
  calculateOrderShipping,
  createCheckoutMetadata,
  getCheckoutProducts,
} from "@/lib/checkout";
import { enforceCheckoutRateLimit } from "@/lib/checkout-rate-limit";
import { stripe } from "@/lib/stripe";
import { checkoutSchema } from "@/validations/checkout";

function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return configuredUrl;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      {
        error: {
          code: "CHECKOUT_UNAVAILABLE",
          message: "Checkout is not configured yet.",
        },
      },
      { status: 503 }
    );
  }

  const checkoutRateLimit = await enforceCheckoutRateLimit(req);
  if (checkoutRateLimit.response) {
    return checkoutRateLimit.response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON" } },
      { status: 400, headers: checkoutRateLimit.headers }
    );
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", details: parsed.error.flatten() } },
      { status: 400, headers: checkoutRateLimit.headers }
    );
  }

  const { items, shippingCountry } = parsed.data;

  try {
    const products = await getCheckoutProducts(items);
    const productMap = new Map(products.map((product) => [product.id, product]));
    const shipping = await calculateOrderShipping(
      "shipping",
      shippingCountry,
      items,
      productMap
    );

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      const product = productMap.get(item.id)!;
      return {
        quantity: item.qty,
        price_data: {
          currency: "eur",
          product_data: {
            name: `${product.artist} - ${product.title}`,
            description: product.format + (product.genre ? ` / ${product.genre}` : ""),
            images: [],
          },
          unit_amount: product.priceCents,
        },
      };
    });

    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "eur",
        product_data: {
          name: `Shipping (${shipping.shippingCountry})`,
        },
        unit_amount: shipping.shippingCents,
      },
    });

    const siteUrl = getSiteUrl();
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: parsed.data.email,
      success_url: `${siteUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      shipping_address_collection: {
        allowed_countries: [
          shippingCountry as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry,
        ],
      },
      metadata: {
        items: JSON.stringify(items),
        shippingCountry,
        paymentMethod: "card",
        deliveryMethod: "shipping",
        ...createCheckoutMetadata(parsed.data),
      },
    });

    return NextResponse.json({ url: session.url }, { headers: checkoutRateLimit.headers });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "CHECKOUT_FAILED",
          message: error instanceof Error ? error.message : "Checkout failed.",
        },
      },
      { status: 409, headers: checkoutRateLimit.headers }
    );
  }
}
