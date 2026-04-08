"use server";

import { db } from "@/db";
import { schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import { syncOrderTrackingById } from "@/lib/order-tracking";
import { allOrderStatuses, getOrderStatusRank, type OrderStatus } from "@/types/order";
import { revalidatePath } from "next/cache";

function revalidateOrderPaths(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/track-order");
}

export async function updateOrderStatus(orderId: string, formData: FormData): Promise<void> {
  "use server";
  await requireAuthenticatedAdmin();

  const newStatus = formData.get("newStatus");
  if (typeof newStatus !== "string" || newStatus.length === 0) return;

  const d = db();

  const order = await d.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
  });

  if (!order) return;

  const nextStatus = newStatus as OrderStatus;
  if (!allOrderStatuses.includes(nextStatus)) {
    return;
  }

  await d
    .update(schema.orders)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(schema.orders.id, orderId));

  revalidateOrderPaths(orderId);
}

export async function saveOrderTracking(orderId: string, formData: FormData): Promise<void> {
  "use server";
  await requireAuthenticatedAdmin();

  const trackingNumberRaw = formData.get("trackingNumber");
  const trackingCarrierRaw = formData.get("trackingCarrier");
  const trackingNumber =
    typeof trackingNumberRaw === "string" ? trackingNumberRaw.trim() : "";
  const trackingCarrier =
    typeof trackingCarrierRaw === "string" ? trackingCarrierRaw.trim().toLowerCase() : "";

  const d = db();
  const order = await d.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
  });

  if (!order) return;

  let nextStatus = order.status as OrderStatus;
  if (
    trackingNumber &&
    order.deliveryMethod === "shipping" &&
    order.status !== "cancelled" &&
    order.status !== "delivered" &&
    getOrderStatusRank(nextStatus) < getOrderStatusRank("shipped")
  ) {
    nextStatus = "shipped";
  }

  await d
    .update(schema.orders)
    .set({
      trackingNumber: trackingNumber || null,
      trackingCarrier: trackingCarrier || null,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(schema.orders.id, orderId));

  if (trackingNumber) {
    await syncOrderTrackingById(orderId);
  }

  revalidateOrderPaths(orderId);
}

export async function syncOrderTrackingAction(orderId: string): Promise<void> {
  "use server";
  await requireAuthenticatedAdmin();
  await syncOrderTrackingById(orderId);
  revalidateOrderPaths(orderId);
}
