import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";

const refreshCartSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(req: NextRequest) {
  const cartRateLimit = await rateLimit(
    `cart-refresh:${getRequestIp(req)}`,
    60,
    60 * 1000
  );

  if (!cartRateLimit.success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again shortly." } },
      {
        status: 429,
        headers: {
          "Retry-After": String(cartRateLimit.retryAfterSeconds),
          "X-RateLimit-Limit": String(cartRateLimit.limit),
          "X-RateLimit-Remaining": String(cartRateLimit.remaining),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  const parsed = refreshCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const productIds = [...new Set(parsed.data.productIds)];
  const products = await db().query.products.findMany({
    where: and(
      eq(schema.products.status, "active"),
      gt(schema.products.stockQuantity, 0),
      isNull(schema.products.deletedAt),
      inArray(schema.products.id, productIds)
    ),
    with: {
      images: {
        orderBy: [schema.productImages.sortOrder],
      },
    },
  });

  return NextResponse.json({
    items: products.map((product) => ({
      productId: product.id,
      title: `${product.artist} - ${product.title}`,
      priceCents: product.priceCents,
      maxQuantity: product.stockQuantity,
      imageUrl: product.images[0]?.url ?? undefined,
      format: product.format,
    })),
  });
}
