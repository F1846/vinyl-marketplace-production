import { NextRequest, NextResponse } from "next/server";
import { createPickupAddress, finalizeOrder } from "@/lib/checkout";
import { pickupCheckoutSchema } from "@/validations/checkout";

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: { code: "CHECKOUT_UNAVAILABLE", message: "Database is not configured." } },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  const parsed = pickupCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const order = await finalizeOrder({
      items: parsed.data.items,
      customerEmail: parsed.data.customerEmail,
      customerName: parsed.data.customerName,
      shippingAddress: createPickupAddress(parsed.data.customerName, parsed.data.note),
      paymentMethod: "pickup",
      deliveryMethod: "pickup",
      status: "pending",
    });

    return NextResponse.json({ orderNumber: order.orderNumber });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "CHECKOUT_FAILED",
          message: error instanceof Error ? error.message : "Pickup checkout failed.",
        },
      },
      { status: 409 }
    );
  }
}
