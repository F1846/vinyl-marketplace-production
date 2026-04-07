import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const lookupSchema = z.object({
  orderNumber: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
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

  return NextResponse.json({
    data: {
      orderNumber: order.orderNumber,
      status: order.status,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      trackingNumber: order.trackingNumber,
      trackingCarrier: order.trackingCarrier,
      items: order.items.map((item: any) => ({
        title: `${item.product.artist} - ${item.product.title}`,
        format: item.product.format,
        quantity: item.quantity,
        priceAtPurchaseCents: item.priceAtPurchaseCents,
      })),
    },
  });
}
