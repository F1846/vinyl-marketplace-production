import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { schema } from "@/db";
import { z } from "zod";

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      qty: z.number().int().min(1).max(10),
      price: z.number().int().min(0),
    })
  ),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_FAILED", details: parsed.error.flatten() } }, { status: 400 });
  }

  const { items } = parsed.data;
  const d = db();

  // Validate stock for each item
  const productIds = items.map((i) => i.id);
  const products = await d
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.status, "active"), schema.products.id.inArray(productIds)));

  const productMap = new Map(products.map((p) => [p.id, p]));
  const lineItems: { price_data: Record<string, unknown>; quantity: number }[] = [];

  for (const item of items) {
    const product = productMap.get(item.id);
    if (!product) {
      return NextResponse.json({ error: { code: "PRODUCT_NOT_FOUND", productId: item.id } }, { status: 404 });
    }
    if (product.stockQuantity < item.qty) {
      return NextResponse.json({
        error: { code: "INSUFFICIENT_STOCK", productId: item.id, available: product.stockQuantity },
      }, { status: 409 });
    }
    if (product.priceCents !== item.price) {
      return NextResponse.json({
        error: { code: "PRICE_CHANGED", productId: item.id, current: product.priceCents },
      }, { status: 409 });
    }

    lineItems.push({
      quantity: item.qty,
      price_data: {
        currency: "usd",
        product_data: {
          name: `${product.artist} - ${product.title}`,
          description: product.format + (product.genre ? ` / ${product.genre}` : ""),
          images: [], // Will need to fetch image URLs
        },
        unit_amount: product.priceCents,
      },
    });
  }

  // Add shipping line
  const shippingCents = parseInt(process.env.SHIPPING_RATE_CENTS ?? "899", 10);
  lineItems.push({
    quantity: 1,
    price_data: {
      currency: "usd",
      product_data: { name: "Shipping" },
      unit_amount: shippingCents,
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${siteUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cart`,
    shipping_address_collection: {
      allowed_countries: ["US"],
    },
    metadata: {
      items: JSON.stringify(items),
    },
  });

  return NextResponse.json({ url: session.url });
}