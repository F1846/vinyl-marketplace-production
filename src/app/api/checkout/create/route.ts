import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { calculateShippingQuote, getCountryLabel } from "@/lib/shipping";
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const { items, shippingCountry } = parsed.data;
  const d = db();
  const productIds = items.map((item) => item.id);
  const products = await d
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.status, "active"), inArray(schema.products.id, productIds)));

  const productMap = new Map(products.map((product) => [product.id, product]));
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const shippingItems: Array<{ format: "vinyl" | "cassette" | "cd"; quantity: number }> = [];

  for (const item of items) {
    const product = productMap.get(item.id);
    if (!product) {
      return NextResponse.json(
        { error: { code: "PRODUCT_NOT_FOUND", productId: item.id } },
        { status: 404 }
      );
    }

    if (product.stockQuantity < item.qty) {
      return NextResponse.json(
        {
          error: {
            code: "INSUFFICIENT_STOCK",
            productId: item.id,
            available: product.stockQuantity,
          },
        },
        { status: 409 }
      );
    }

    if (product.priceCents !== item.price) {
      return NextResponse.json(
        {
          error: {
            code: "PRICE_CHANGED",
            productId: item.id,
            current: product.priceCents,
          },
        },
        { status: 409 }
      );
    }

    lineItems.push({
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
    });

    shippingItems.push({
      format: product.format,
      quantity: item.qty,
    });
  }

  let shippingQuote;
  try {
    shippingQuote = await calculateShippingQuote(shippingCountry, shippingItems);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SHIPPING_UNAVAILABLE",
          message:
            error instanceof Error
              ? error.message
              : "No shipping rate is configured for this cart.",
        },
      },
      { status: 409 }
    );
  }

  lineItems.push({
    quantity: 1,
    price_data: {
      currency: "eur",
      product_data: {
        name: `Shipping to ${getCountryLabel(shippingCountry)}`,
      },
      unit_amount: shippingQuote.totalCents,
    },
  });

  const siteUrl = getSiteUrl();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
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
      shippingCents: String(shippingQuote.totalCents),
    },
  });

  return NextResponse.json({ url: session.url });
}
