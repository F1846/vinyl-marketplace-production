import { and, eq, gte, gt, inArray, isNull, sql } from "drizzle-orm";
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
import type { ProductFormat, ProductStatus } from "@/types/product";
import type { ShippingDetailsInput } from "@/validations/checkout";

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

type CheckoutMetadata = Record<string, string>;

function cleanCheckoutValue(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function combineStreetAddress(street: string, houseNumber: string): string {
  return [street.trim(), houseNumber.trim()].filter(Boolean).join(" ").trim();
}

export function getCheckoutCustomerName(input: ShippingDetailsInput): string {
  return [input.firstName.trim(), input.lastName.trim()].filter(Boolean).join(" ").trim();
}

export function createShippingAddressFromCheckout(
  input: ShippingDetailsInput
): ShippingAddress {
  const additionalInfo = cleanCheckoutValue(input.additionalInfo);
  const phoneNumber = cleanCheckoutValue(input.phoneNumber);

  return {
    name: getCheckoutCustomerName(input),
    line1: combineStreetAddress(input.street, input.houseNumber),
    line2: additionalInfo,
    city: input.city.trim(),
    state: "",
    postalCode: input.postalCode.trim(),
    country: input.shippingCountry.trim().toUpperCase(),
    phone: phoneNumber,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    street: input.street.trim(),
    houseNumber: input.houseNumber.trim(),
    phoneNumber,
    additionalInfo,
  };
}

export function createCheckoutMetadata(input: ShippingDetailsInput): CheckoutMetadata {
  return {
    customerFirstName: input.firstName.trim(),
    customerLastName: input.lastName.trim(),
    customerEmail: input.email.trim(),
    shippingCountry: input.shippingCountry.trim().toUpperCase(),
    shippingStreet: input.street.trim(),
    shippingHouseNumber: input.houseNumber.trim(),
    shippingPostalCode: input.postalCode.trim(),
    shippingCity: input.city.trim(),
    shippingPhone: input.phoneNumber.trim(),
    shippingAdditionalInfo: input.additionalInfo?.trim() ?? "",
  };
}

export function createShippingAddressFromMetadata(
  metadata: Record<string, string | null | undefined>
): ShippingAddress | null {
  const firstName = cleanCheckoutValue(metadata.customerFirstName);
  const lastName = cleanCheckoutValue(metadata.customerLastName);
  const email = cleanCheckoutValue(metadata.customerEmail);
  const country = cleanCheckoutValue(metadata.shippingCountry);
  const street = cleanCheckoutValue(metadata.shippingStreet);
  const houseNumber = cleanCheckoutValue(metadata.shippingHouseNumber);
  const postalCode = cleanCheckoutValue(metadata.shippingPostalCode);
  const city = cleanCheckoutValue(metadata.shippingCity);
  const phoneNumber = cleanCheckoutValue(metadata.shippingPhone);
  const additionalInfo = cleanCheckoutValue(metadata.shippingAdditionalInfo);

  if (
    !firstName ||
    !lastName ||
    !email ||
    !country ||
    !street ||
    !houseNumber ||
    !postalCode ||
    !city ||
    !phoneNumber
  ) {
    return null;
  }

  return createShippingAddressFromCheckout({
    firstName,
    lastName,
    email,
    shippingCountry: country,
    street,
    houseNumber,
    postalCode,
    city,
    phoneNumber,
    additionalInfo: additionalInfo ?? "",
  });
}

export function mergeShippingAddress(
  fallback: ShippingAddress,
  override: Partial<ShippingAddress>
): ShippingAddress {
  return {
    ...fallback,
    ...override,
    name: cleanCheckoutValue(override.name) ?? fallback.name,
    line1: cleanCheckoutValue(override.line1) ?? fallback.line1,
    line2:
      cleanCheckoutValue(override.line2) ??
      cleanCheckoutValue(override.additionalInfo) ??
      fallback.line2,
    city: cleanCheckoutValue(override.city) ?? fallback.city,
    state: cleanCheckoutValue(override.state) ?? fallback.state,
    postalCode: cleanCheckoutValue(override.postalCode) ?? fallback.postalCode,
    country: cleanCheckoutValue(override.country) ?? fallback.country,
    phone:
      cleanCheckoutValue(override.phone) ??
      cleanCheckoutValue(override.phoneNumber) ??
      fallback.phone,
    firstName: cleanCheckoutValue(override.firstName) ?? fallback.firstName,
    lastName: cleanCheckoutValue(override.lastName) ?? fallback.lastName,
    email: cleanCheckoutValue(override.email) ?? fallback.email,
    street: cleanCheckoutValue(override.street) ?? fallback.street,
    houseNumber: cleanCheckoutValue(override.houseNumber) ?? fallback.houseNumber,
    phoneNumber:
      cleanCheckoutValue(override.phoneNumber) ??
      cleanCheckoutValue(override.phone) ??
      fallback.phoneNumber,
    additionalInfo:
      cleanCheckoutValue(override.additionalInfo) ??
      cleanCheckoutValue(override.line2) ??
      fallback.additionalInfo,
    pickupLocation:
      cleanCheckoutValue(override.pickupLocation) ?? fallback.pickupLocation,
    pickupNote: cleanCheckoutValue(override.pickupNote) ?? fallback.pickupNote,
  };
}

export async function getCheckoutProducts(items: CheckoutCartItem[]): Promise<ProductRecord[]> {
  const productIds = [...new Set(items.map((item) => item.id))];
  const products = await db()
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.status, "active"),
        gt(schema.products.stockQuantity, 0),
        isNull(schema.products.deletedAt),
        inArray(schema.products.id, productIds)
      )
    );

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
          status: sql<ProductStatus>`case
            when ${schema.products.stockQuantity} + ${item.quantity} > 0 then 'active'::product_status
            else 'sold_out'::product_status
          end`,
          version: sql`${schema.products.version} + 1`,
          updatedAt: new Date(),
        })
      .where(eq(schema.products.id, item.productId));
  }
}

export function createPickupAddress(_customerName: string, note?: string | null): ShippingAddress {
  return {
    name: siteConfig.pickupContactName,
    line1: siteConfig.pickupStreet,
    line2: null,
    city: siteConfig.pickupCity,
    state: "",
    postalCode: siteConfig.pickupPostalCode,
    country: siteConfig.pickupCountry,
    phone: null,
    phoneNumber: null,
    pickupLocation: siteConfig.pickupLabel,
    pickupNote: note?.trim() || null,
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
          status: sql<ProductStatus>`case
            when ${schema.products.stockQuantity} - ${item.qty} <= 0 then 'sold_out'::product_status
            else 'active'::product_status
          end`,
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
