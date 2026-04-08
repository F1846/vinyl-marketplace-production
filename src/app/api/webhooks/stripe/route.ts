import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createPickupAddress, finalizeOrder } from "@/lib/checkout";
import { stripe } from "@/lib/stripe";
import type { ShippingAddress } from "@/types/order";

type CheckoutItem = {
  id: string;
  qty: number;
  price: number;
};

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

    let items: CheckoutItem[];
    try {
      items = session.metadata?.items ? JSON.parse(session.metadata.items) : [];
    } catch {
      return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "No checkout items found" }, { status: 400 });
    }

    const deliveryMethod =
      session.metadata?.deliveryMethod === "pickup" ? "pickup" : "shipping";
    const paymentMethod = "card";
    const customerName =
      session.shipping_details?.name ??
      session.customer_details?.name ??
      "Customer";
    const customerEmail = session.customer_details?.email ?? "";

    const shippingAddress: ShippingAddress =
      deliveryMethod === "pickup"
        ? createPickupAddress(customerName)
        : {
            name: session.shipping_details?.name ?? customerName,
            line1: session.shipping_details?.address?.line1 ?? "",
            line2: session.shipping_details?.address?.line2 ?? null,
            city: session.shipping_details?.address?.city ?? "",
            state: session.shipping_details?.address?.state ?? "",
            postalCode: session.shipping_details?.address?.postal_code ?? "",
            country:
              session.shipping_details?.address?.country ??
              session.metadata?.shippingCountry ??
              "",
            phone: null,
          };

    try {
      await finalizeOrder({
        items,
        customerEmail,
        customerName,
        shippingAddress,
        shippingCountry: session.metadata?.shippingCountry ?? undefined,
        paymentMethod,
        deliveryMethod,
        stripeSessionId: session.id,
        stripePaymentIntentId: (session.payment_intent as string | null) ?? null,
        status: "processing",
      });
    } catch (error) {
      console.error("Failed to create order from Stripe webhook:", error);
      return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
