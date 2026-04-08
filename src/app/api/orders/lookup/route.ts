import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { syncOrderTracking } from "@/lib/order-tracking";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const lookupSchema = z.object({
  orderNumber: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const lookupRateLimit = rateLimit(
    `order-lookup:${getRequestIp(req)}`,
    10,
    10 * 60 * 1000
  );

  if (!lookupRateLimit.success) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many lookup attempts. Please try again shortly.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(lookupRateLimit.retryAfterSeconds),
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

  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Order number and valid email required" } },
      { status: 400 }
    );
  }

  const { orderNumber, email } = parsed.data;
  const d = db();

  const order = await d.query.orders.findFirst({
    where: and(
      eq(schema.orders.orderNumber, orderNumber),
      eq(schema.orders.customerEmail, email)
    ),
    with: {
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  // Security: return generic message whether order exists or not (prevent info leakage)
  if (!order) {
    return NextResponse.json({ data: null }, { status: 200 });
  }

  let effectiveOrder = {
    status: order.status,
    paymentMethod: order.paymentMethod,
    deliveryMethod: order.deliveryMethod,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    trackingNumber: order.trackingNumber,
    trackingCarrier: order.trackingCarrier,
    orderNumber: order.orderNumber,
  };
  let trackingSummary = null;

  if (order.trackingNumber && order.deliveryMethod === "shipping") {
    try {
      const synced = await syncOrderTracking(order);
      effectiveOrder = {
        ...effectiveOrder,
        status: synced.order.status,
        paymentMethod: synced.order.paymentMethod,
        deliveryMethod: synced.order.deliveryMethod,
        totalCents: synced.order.totalCents,
        createdAt: synced.order.createdAt,
        trackingNumber: synced.order.trackingNumber,
        trackingCarrier: synced.order.trackingCarrier,
        orderNumber: synced.order.orderNumber,
      };
      trackingSummary = synced.trackingSummary;
    } catch {
      trackingSummary = null;
    }
  }

  return NextResponse.json({
    data: {
      orderNumber: effectiveOrder.orderNumber,
      status: effectiveOrder.status,
      paymentMethod: effectiveOrder.paymentMethod,
      deliveryMethod: effectiveOrder.deliveryMethod,
      totalCents: effectiveOrder.totalCents,
      createdAt: effectiveOrder.createdAt,
      trackingNumber: effectiveOrder.trackingNumber,
      trackingCarrier: effectiveOrder.trackingCarrier,
      trackingSummary,
      items: order.items.map((item: any) => ({
        title: `${item.product.artist} - ${item.product.title}`,
        format: item.product.format,
        quantity: item.quantity,
        priceAtPurchaseCents: item.priceAtPurchaseCents,
      })),
    },
  });
}
