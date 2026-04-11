import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  sendManualOrderMessage,
  sendOrderStatusUpdate,
  sendShippingNotification,
  type CustomerEmailSender,
} from "@/lib/email";
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
            with: {
              images: {
                columns: {
                  url: true,
                  sortOrder: true,
                },
                orderBy: [schema.productImages.sortOrder],
                limit: 1,
              },
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
        artist: item.product.artist,
        title: item.product.title,
        format: item.product.format,
        imageUrl: item.product.images[0]?.url ?? null,
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

export async function sendManualOrderMessageById(input: {
  orderId: string;
  sender: CustomerEmailSender;
  subject: string;
  message: string;
}): Promise<boolean> {
  const order = await getOrderWithItemsForEmail(input.orderId);
  if (!order) {
    return false;
  }

  await sendManualOrderMessage(order, {
    sender: input.sender,
    subject: input.subject,
    message: input.message,
  });
  return true;
}
