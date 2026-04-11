import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { calculateShippingQuote } from "@/lib/shipping";
import { shippingQuoteSchema } from "@/validations/checkout";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`shipping-quote:${getRequestIp(req)}`, 20, 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." } },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  const parsed = shippingQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const { items, shippingCountry } = parsed.data;
  const productIds = items.map((item) => item.id);
  const products = await db()
    .select({
      id: schema.products.id,
      format: schema.products.format,
    })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.status, "active"),
        gt(schema.products.stockQuantity, 0),
        isNull(schema.products.deletedAt),
        inArray(schema.products.id, productIds)
      )
    );

  const productMap = new Map(products.map((product) => [product.id, product]));
  const shippingItems = items.map((item) => {
    const product = productMap.get(item.id);
    if (!product) {
      return null;
    }

    return {
      format: product.format,
      quantity: item.qty,
    };
  });

  if (shippingItems.some((item) => item === null)) {
    return NextResponse.json({ error: { code: "PRODUCT_NOT_FOUND" } }, { status: 404 });
  }

  try {
    const quote = await calculateShippingQuote(
      shippingCountry,
      shippingItems.filter((item): item is NonNullable<typeof item> => item !== null)
    );

    return NextResponse.json({ quote });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SHIPPING_UNAVAILABLE",
          message: error instanceof Error ? error.message : "No shipping option is configured for this cart.",
        },
      },
      { status: 409 }
    );
  }
}
