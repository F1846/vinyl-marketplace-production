import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { schema } from "@/db";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { sendOrderConfirmation } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const d = db();

    // ─── Idempotency: check if we already processed this session ───
    const existingOrder = await d.query.orders.findFirst({
      where: eq(schema.orders.stripeSessionId, session.id ?? ""),
    });

    if (existingOrder) {
      // Already processed — return 200 to avoid Stripe retry
      return NextResponse.json({ received: true });
    }

    // ─── Parse metadata ───
    const metadata = session.metadata;
    let items: Array<{ id: string; qty: number; price: number }>;
    try {
      items = metadata?.items ? JSON.parse(metadata.items) : [];
    } catch {
      console.error("Failed to parse checkout session metadata");
      return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
    }

    // ─── Generate order number ───
    const orderCount = await d.select({ count: sql<number>`count(*)` }).from(schema.orders);
    const sequence = (orderCount[0]?.count ?? 0) + 1;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const orderNumber = `VM-${dateStr}-${String(sequence).padStart(4, "0")}`;

    // ─── Shipping address ───
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

    // ─── Calculate totals ───
    const shippingCents = parseInt(process.env.SHIPPING_RATE_CENTS ?? "899", 10);
    // Fetch current prices to be safe
    const productIds = items.map((i) => i.id);
    const products = await d
      .select()
      .from(schema.products)
      .where(inArray(schema.products.id, productIds));
    const productMap = new Map(products.map((p) => [p.id, p]));

    const subtotalCents = items.reduce((sum, item) => {
      const prod = productMap.get(item.id);
      return sum + (prod ? prod.priceCents * item.qty : 0);
    }, 0);

    const totalCents = subtotalCents + shippingCents;

    // ─── Insert order + order items in transaction ───
    try {
      const order = await d.transaction(async (tx) => {
        const [newOrder] = await tx.insert(schema.orders).values({
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
        }).returning();

        // Insert order items
        for (const item of items) {
          const prod = productMap.get(item.id);
          if (!prod) continue;
          await tx.insert(schema.orderItems).values({
            id: crypto.randomUUID(),
            orderId: newOrder.id,
            productId: item.id,
            quantity: item.qty,
            priceAtPurchaseCents: prod.priceCents,
          });
        }

        // Reserve stock atomically using the try_reserve_stock function
        for (const item of items) {
          const reserved = await tx
            .update(schema.products)
            .set({
              stockQuantity: sql`${schema.products.stockQuantity} - ${item.qty}`,
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
        }

        return newOrder;
      });

      // ─── Send confirmation email ───
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
          const prod = productMap.get(item.id);
          return {
            id: crypto.randomUUID(),
            orderId: order.id,
            productId: item.id,
            quantity: item.qty,
            priceAtPurchaseCents: prod?.priceCents ?? 0,
            createdAt: new Date(),
            product: {
              artist: prod?.artist ?? "Unknown",
              title: prod?.title ?? "Unknown",
              format: prod?.format ?? "vinyl",
              imageUrl: null,
            },
          };
        }),
      };

      try {
        await sendOrderConfirmation(orderWithItems);
      } catch (emailErr) {
        console.error("Failed to send order confirmation email:", emailErr);
        // Do not fail the webhook — email can be resent manually
      }
    } catch (dbErr) {
      console.error("Failed to create order from webhook:", dbErr);
      return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
