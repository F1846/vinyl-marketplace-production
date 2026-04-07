import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendOrderConfirmation } from "@/lib/email";
import { generateOrderNumber } from "@/lib/order-number";
import { calculateShippingQuote } from "@/lib/shipping";
import { stripe } from "@/lib/stripe";

type CheckoutItem = {
  id: string;
  qty: number;
  price: number;
};

async function releaseReservedStock(items: Array<{ productId: string; quantity: number }>) {
  if (items.length === 0) return;

  const d = db();
  for (const item of items) {
    await d
      .update(schema.products)
      .set({
        stockQuantity: sql`${schema.products.stockQuantity} + ${item.quantity}`,
        version: sql`${schema.products.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, item.productId));
  }
}

export async function POST(req: NextRequest) {
  if (
    !process.env.DATABASE_URL ||
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const d = db();

    const existingOrder = await d.query.orders.findFirst({
      where: eq(schema.orders.stripeSessionId, session.id ?? ""),
    });

    if (existingOrder) {
      return NextResponse.json({ received: true });
    }

    const metadata = session.metadata;
    let items: CheckoutItem[];
    try {
      items = metadata?.items ? JSON.parse(metadata.items) : [];
    } catch {
      console.error("Failed to parse checkout session metadata");
      return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "No checkout items found" }, { status: 400 });
    }

    const orderCount = await d
      .select({ count: sql<number>`count(*)` })
      .from(schema.orders);
    const orderNumber = generateOrderNumber((orderCount[0]?.count ?? 0) + 1);

    const shipping = session.shipping_details;
    const shippingAddress = {
      name: shipping?.name ?? "",
      line1: shipping?.address?.line1 ?? "",
      line2: shipping?.address?.line2 ?? null,
      city: shipping?.address?.city ?? "",
      state: shipping?.address?.state ?? "",
      postalCode: shipping?.address?.postal_code ?? "",
      country: shipping?.address?.country ?? "",
      phone: null,
    };

    const productIds = items.map((item) => item.id);
    const products = await d
      .select()
      .from(schema.products)
      .where(inArray(schema.products.id, productIds));

    const productMap = new Map(products.map((product) => [product.id, product]));
    for (const item of items) {
      if (!productMap.has(item.id)) {
        return NextResponse.json({ error: "Product no longer exists" }, { status: 400 });
      }
    }

    const subtotalCents = items.reduce((sum, item) => {
      const product = productMap.get(item.id);
      return sum + (product ? product.priceCents * item.qty : 0);
    }, 0);

    const shippingCountry = shippingAddress.country || metadata?.shippingCountry || "";

    let shippingQuote;
    try {
      shippingQuote = await calculateShippingQuote(
        shippingCountry,
        items.map((item) => ({
          format: productMap.get(item.id)!.format,
          quantity: item.qty,
        }))
      );
    } catch (shippingError) {
      console.error("Failed to calculate shipping for webhook:", shippingError);
      return NextResponse.json({ error: "Shipping calculation failed" }, { status: 500 });
    }

    const shippingCents = shippingQuote.totalCents;
    const totalCents = subtotalCents + shippingCents;
    const reservedItems: Array<{ productId: string; quantity: number }> = [];

    try {
      for (const item of items) {
        const reserved = await d
          .update(schema.products)
          .set({
            stockQuantity: sql`${schema.products.stockQuantity} - ${item.qty}`,
            version: sql`${schema.products.version} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.products.id, item.id),
              gte(schema.products.stockQuantity, item.qty)
            )
          )
          .returning({ id: schema.products.id });

        if (reserved.length === 0) {
          throw new Error(`Insufficient stock while finalizing order for product ${item.id}`);
        }

        reservedItems.push({
          productId: item.id,
          quantity: item.qty,
        });
      }

      const [order] = await d
        .insert(schema.orders)
        .values({
          id: crypto.randomUUID(),
          orderNumber,
          customerEmail: session.customer_details?.email ?? "",
          customerName: session.shipping_details?.name ?? "Customer",
          shippingAddress,
          subtotalCents,
          shippingCents,
          taxCents: 0,
          totalCents,
          status: "processing",
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string | null,
        })
        .returning();

      await d.insert(schema.orderItems).values(
        items.map((item) => ({
          id: crypto.randomUUID(),
          orderId: order.id,
          productId: item.id,
          quantity: item.qty,
          priceAtPurchaseCents: productMap.get(item.id)!.priceCents,
        }))
      );

      const orderWithItems = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        shippingAddress,
        subtotalCents,
        shippingCents,
        taxCents: 0,
        totalCents,
        status: order.status as "pending" | "processing" | "shipped" | "delivered" | "cancelled",
        trackingNumber: null,
        trackingCarrier: null,
        stripeSessionId: order.stripeSessionId,
        stripePaymentIntentId: order.stripePaymentIntentId,
        createdAt: order.createdAt ?? new Date(),
        updatedAt: new Date(),
        items: items.map((item) => {
          const product = productMap.get(item.id);
          return {
            id: crypto.randomUUID(),
            orderId: order.id,
            productId: item.id,
            quantity: item.qty,
            priceAtPurchaseCents: product?.priceCents ?? 0,
            createdAt: new Date(),
            product: {
              artist: product?.artist ?? "Unknown",
              title: product?.title ?? "Unknown",
              format: product?.format ?? "vinyl",
              imageUrl: null,
            },
          };
        }),
      };

      try {
        await sendOrderConfirmation(orderWithItems);
      } catch (emailErr) {
        console.error("Failed to send order confirmation email:", emailErr);
      }
    } catch (dbErr) {
      await releaseReservedStock(reservedItems);
      console.error("Failed to create order from webhook:", dbErr);
      return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
