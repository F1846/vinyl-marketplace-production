import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendOrderStatusUpdate, sendShippingNotification } from "@/lib/email";
import { fetchTrackingSummary } from "@/lib/order-tracking";
import type {
  OrderStatus,
  OrderWithItems,
  ShippingAddress,
  TrackingSummary,
} from "@/types/order";

async function getOrderWithItemsForEmail(orderId: string): Promise<OrderWithItems | null> {
  const order = await db().query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
    with: {
      items: {
        with: {
          product: {
            columns: {
              artist: true,
              title: true,
              format: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  return {
    ...order,
    shippingAddress: order.shippingAddress as ShippingAddress,
    items: order.items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        imageUrl: null,
      },
    })),
  };
}

export async function sendOrderUpdateEmailById(input: {
  orderId: string;
  previousStatus?: OrderStatus | null;
  trackingSummary?: TrackingSummary | null;
  kind?: "status" | "shipping";
}): Promise<boolean> {
  const order = await getOrderWithItemsForEmail(input.orderId);
  if (!order) {
    return false;
  }

  const trackingSummary =
    input.trackingSummary ??
    (order.trackingNumber ? await fetchTrackingSummary(order) : null);

  if (input.kind === "shipping") {
    await sendShippingNotification(order, trackingSummary);
    return true;
  }

  await sendOrderStatusUpdate(order, {
    previousStatus: input.previousStatus ?? null,
    trackingSummary,
  });
  return true;
}
