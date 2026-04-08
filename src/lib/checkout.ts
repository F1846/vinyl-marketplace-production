import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendOrderConfirmation } from "@/lib/email";
import { generateOrderNumber } from "@/lib/order-number";
import { calculateShippingQuote } from "@/lib/shipping";
import { siteConfig } from "@/lib/site";
import type {
  DeliveryMethod,
  OrderStatus,
  PaymentMethod,
  ShippingAddress,
} from "@/types/order";
import type { ProductFormat } from "@/types/product";

export type CheckoutCartItem = {
  id: string;
  qty: number;
  price: number;
};

type ProductRecord = typeof schema.products.$inferSelect;

type FinalizeOrderInput = {
  items: CheckoutCartItem[];
  customerEmail: string;
  customerName: string;
  shippingAddress: ShippingAddress;
  shippingCountry?: string;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  status?: OrderStatus;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  paypalOrderId?: string | null;
};

export async function getCheckoutProducts(items: CheckoutCartItem[]): Promise<ProductRecord[]> {
  const productIds = [...new Set(items.map((item) => item.id))];
  const products = await db()
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.status, "active"), inArray(schema.products.id, productIds)));

  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const item of items) {
    const product = productMap.get(item.id);
    if (!product) {
      throw new Error(`Product ${item.id} was not found.`);
    }
    if (product.stockQuantity < item.qty) {
      throw new Error(`Insufficient stock for ${product.artist} - ${product.title}.`);
    }
    if (product.priceCents !== item.price) {
      throw new Error(`Price changed for ${product.artist} - ${product.title}.`);
    }
  }

  return products;
}

export async function calculateOrderShipping(
  deliveryMethod: DeliveryMethod,
  shippingCountry: string | undefined,
  items: CheckoutCartItem[],
  productMap: Map<string, ProductRecord>
) {
  if (deliveryMethod === "pickup") {
    return {
      shippingCents: 0,
      shippingCountry: "PICKUP",
    };
  }

  if (!shippingCountry) {
    throw new Error("Shipping country is required.");
  }

  const shippingQuote = await calculateShippingQuote(
    shippingCountry,
    items.map((item) => ({
      format: productMap.get(item.id)!.format,
      quantity: item.qty,
    }))
  );

  return {
    shippingCents: shippingQuote.totalCents,
    shippingCountry: shippingQuote.countryCode,
  };
}

async function releaseReservedStock(items: Array<{ productId: string; quantity: number }>) {
  if (items.length === 0) {
    return;
  }

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

export function createPickupAddress(customerName: string, note?: string | null): ShippingAddress {
  return {
    name: customerName,
    line1: siteConfig.legal.street,
    line2: siteConfig.legal.street2,
    city: siteConfig.legal.city,
    state: "",
    postalCode: siteConfig.legal.postalCode,
    country: siteConfig.legal.country,
    phone: siteConfig.legal.phone,
    pickupLocation: siteConfig.pickupLabel,
    pickupNote: note?.trim() || siteConfig.pickupNote,
  };
}

export function toCheckoutFormats(
  items: CheckoutCartItem[],
  productMap: Map<string, ProductRecord>
): Array<{ format: ProductFormat; quantity: number }> {
  return items.map((item) => ({
    format: productMap.get(item.id)!.format,
    quantity: item.qty,
  }));
}

export async function finalizeOrder(input: FinalizeOrderInput) {
  const d = db();
  const products = await getCheckoutProducts(input.items);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const subtotalCents = input.items.reduce((sum, item) => {
    const product = productMap.get(item.id)!;
    return sum + product.priceCents * item.qty;
  }, 0);

  const shipping = await calculateOrderShipping(
    input.deliveryMethod,
    input.shippingCountry,
    input.items,
    productMap
  );
  const totalCents = subtotalCents + shipping.shippingCents;

  const reservedItems: Array<{ productId: string; quantity: number }> = [];
  let createdOrderId: string | null = null;

  try {
    for (const item of input.items) {
      const reserved = await d
        .update(schema.products)
        .set({
          stockQuantity: sql`${schema.products.stockQuantity} - ${item.qty}`,
          version: sql`${schema.products.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(schema.products.id, item.id), gte(schema.products.stockQuantity, item.qty))
        )
        .returning({ id: schema.products.id });

      if (reserved.length === 0) {
        throw new Error(`Insufficient stock while finalizing order for product ${item.id}`);
      }

      reservedItems.push({ productId: item.id, quantity: item.qty });
    }

    const [order] = await d
      .insert(schema.orders)
      .values({
        id: crypto.randomUUID(),
        orderNumber: generateOrderNumber(),
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        shippingAddress: input.shippingAddress,
        subtotalCents,
        shippingCents: shipping.shippingCents,
        taxCents: 0,
        totalCents,
        status: input.status ?? (input.paymentMethod === "pickup" ? "pending" : "processing"),
        paymentMethod: input.paymentMethod,
        deliveryMethod: input.deliveryMethod,
        trackingNumber: null,
        trackingCarrier: null,
        stripeSessionId: input.stripeSessionId ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        paypalOrderId: input.paypalOrderId ?? null,
      })
      .returning();
    createdOrderId = order.id;

    await d.insert(schema.orderItems).values(
      input.items.map((item) => ({
        id: crypto.randomUUID(),
        orderId: order.id,
        productId: item.id,
        quantity: item.qty,
        priceAtPurchaseCents: productMap.get(item.id)!.priceCents,
      }))
    );

    const orderWithItems = {
      ...order,
      shippingAddress: input.shippingAddress,
      items: input.items.map((item) => {
        const product = productMap.get(item.id)!;
        return {
          id: crypto.randomUUID(),
          orderId: order.id,
          productId: item.id,
          quantity: item.qty,
          priceAtPurchaseCents: product.priceCents,
          createdAt: new Date(),
          product: {
            artist: product.artist,
            title: product.title,
            format: product.format,
            imageUrl: null,
          },
        };
      }),
    };

    try {
      await sendOrderConfirmation(orderWithItems);
    } catch (error) {
      console.error("Failed to send order confirmation email:", error);
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalCents: order.totalCents,
    };
  } catch (error) {
    if (createdOrderId) {
      await d.delete(schema.orders).where(eq(schema.orders.id, createdOrderId));
    }
    await releaseReservedStock(reservedItems);
    throw error;
  }
}
