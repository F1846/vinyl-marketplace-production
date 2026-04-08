import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  isCheckoutStateSigningConfigured,
  verifyCheckoutStateToken,
} from "@/lib/checkout-state";
import {
  createShippingAddressFromCheckout,
  finalizeOrder,
  getCheckoutCustomerName,
  mergeShippingAddress,
} from "@/lib/checkout";
import { capturePayPalOrder } from "@/lib/paypal";
import { paypalCaptureSchema } from "@/validations/checkout";
import type { ShippingAddress } from "@/types/order";

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: { code: "CHECKOUT_UNAVAILABLE", message: "Database is not configured." } },
      { status: 503 }
    );
  }

  if (!isCheckoutStateSigningConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "PAYPAL_UNAVAILABLE",
          message: "PayPal checkout state signing is not configured.",
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

  const parsed = paypalCaptureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const state = verifyCheckoutStateToken(parsed.data.state);
  if (!state) {
    return NextResponse.json(
      { error: { code: "INVALID_STATE", message: "PayPal checkout state is invalid or expired." } },
      { status: 400 }
    );
  }

  const existingOrder = await db().query.orders.findFirst({
    where: eq(schema.orders.paypalOrderId, parsed.data.token),
  });

  if (existingOrder) {
    return NextResponse.json({ orderNumber: existingOrder.orderNumber });
  }

  try {
    const captured = await capturePayPalOrder(parsed.data.token);
    const customerName = getCheckoutCustomerName(state.shippingDetails);
    const fallbackShippingAddress = createShippingAddressFromCheckout(state.shippingDetails);
    const capturedShippingAddress: Partial<ShippingAddress> = {
      name:
        captured.purchase_units?.[0]?.shipping?.name?.full_name ??
        [
          captured.payer?.name?.given_name,
          captured.payer?.name?.surname,
        ]
          .filter(Boolean)
          .join(" ")
          .trim(),
      line1: captured.purchase_units?.[0]?.shipping?.address?.address_line_1,
      line2: captured.purchase_units?.[0]?.shipping?.address?.address_line_2 ?? null,
      city: captured.purchase_units?.[0]?.shipping?.address?.admin_area_2,
      state: captured.purchase_units?.[0]?.shipping?.address?.admin_area_1,
      postalCode: captured.purchase_units?.[0]?.shipping?.address?.postal_code,
      country:
        captured.purchase_units?.[0]?.shipping?.address?.country_code ??
        state.shippingDetails.shippingCountry,
    };
    const shippingAddress = mergeShippingAddress(
      fallbackShippingAddress,
      capturedShippingAddress
    );

    const order = await finalizeOrder({
      items: state.items,
      customerEmail: state.shippingDetails.email,
      customerName,
      shippingAddress,
      shippingCountry: state.shippingDetails.shippingCountry,
      paymentMethod: "paypal",
      deliveryMethod: "shipping",
      paypalOrderId: captured.id,
      status: "processing",
    });

    return NextResponse.json({ orderNumber: order.orderNumber });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "PAYPAL_CAPTURE_FAILED",
          message: error instanceof Error ? error.message : "Could not capture PayPal order.",
        },
      },
      { status: 409 }
    );
  }
}
