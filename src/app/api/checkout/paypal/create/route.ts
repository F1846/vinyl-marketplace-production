import { NextRequest, NextResponse } from "next/server";
import { createCheckoutStateToken } from "@/lib/checkout-state";
import {
  calculateOrderShipping,
  createShippingAddressFromCheckout,
  getCheckoutProducts,
} from "@/lib/checkout";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { siteUrl } from "@/lib/site";
import { checkoutSchema } from "@/validations/checkout";

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL || !isPayPalConfigured()) {
    return NextResponse.json(
      { error: { code: "PAYPAL_UNAVAILABLE", message: "PayPal is not configured." } },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const { items, shippingCountry } = parsed.data;
    const products = await getCheckoutProducts(items);
    const productMap = new Map(products.map((product) => [product.id, product]));
    const shipping = await calculateOrderShipping(
      "shipping",
      shippingCountry,
      items,
      productMap
    );
    const shippingAddress = createShippingAddressFromCheckout(parsed.data);
    const subtotalCents = items.reduce((sum, item) => {
      const product = productMap.get(item.id)!;
      return sum + product.priceCents * item.qty;
    }, 0);

    const state = createCheckoutStateToken({
      items,
      shippingDetails: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        shippingCountry: parsed.data.shippingCountry,
        street: parsed.data.street,
        houseNumber: parsed.data.houseNumber,
        postalCode: parsed.data.postalCode,
        city: parsed.data.city,
        phoneNumber: parsed.data.phoneNumber,
        additionalInfo: parsed.data.additionalInfo,
      },
    });
    const order = await createPayPalOrder({
      items: items.map((item) => {
        const product = productMap.get(item.id)!;
        return {
          name: `${product.artist} - ${product.title}`,
          description: product.format,
          unitAmountCents: product.priceCents,
          quantity: item.qty,
        };
      }),
      subtotalCents,
      shippingCents: shipping.shippingCents,
      totalCents: subtotalCents + shipping.shippingCents,
      returnUrl: `${siteUrl("/checkout/paypal")}?state=${encodeURIComponent(state)}`,
      cancelUrl: siteUrl("/cart?paypal=cancelled"),
      requestId: crypto.randomUUID(),
      shippingAddress: {
        fullName: shippingAddress.name,
        line1: shippingAddress.line1,
        line2: shippingAddress.line2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        countryCode: shippingAddress.country,
      },
    });

    return NextResponse.json({ url: order.approveUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "PAYPAL_CREATE_FAILED",
          message: error instanceof Error ? error.message : "Could not start PayPal checkout.",
        },
      },
      { status: 409 }
    );
  }
}
