import { NextRequest, NextResponse } from "next/server";
import { createCheckoutStateToken } from "@/lib/checkout-state";
import { calculateOrderShipping, getCheckoutProducts } from "@/lib/checkout";
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
    const subtotalCents = items.reduce((sum, item) => {
      const product = productMap.get(item.id)!;
      return sum + product.priceCents * item.qty;
    }, 0);

    const state = createCheckoutStateToken({ items, shippingCountry });
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
