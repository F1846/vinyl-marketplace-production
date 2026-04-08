"use server";

import { db } from "@/db";
import { schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import { fetchTrackingSummary, syncOrderTrackingById } from "@/lib/order-tracking";
import { sendOrderUpdateEmailById } from "@/lib/order-notifications";
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

  if (order.status === nextStatus) {
    return;
  }

  await d
    .update(schema.orders)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(schema.orders.id, orderId));

  try {
    const trackingSummary =
      nextStatus === "shipped" || nextStatus === "delivered"
        ? await fetchTrackingSummary({ ...order, status: nextStatus })
        : null;
    await sendOrderUpdateEmailById({
      orderId,
      previousStatus: order.status as OrderStatus,
      trackingSummary,
      kind: nextStatus === "shipped" ? "shipping" : "status",
    });
  } catch (error) {
    console.error("Failed to send order status email:", error);
  }

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

  const previousStatus = order.status as OrderStatus;
  const previousTrackingNumber = order.trackingNumber;
  const previousTrackingCarrier = order.trackingCarrier;

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

  const syncResult = trackingNumber ? await syncOrderTrackingById(orderId) : null;

  try {
    const trackingChanged =
      trackingNumber !== (previousTrackingNumber ?? "") ||
      trackingCarrier !== (previousTrackingCarrier ?? "");
    const effectiveStatus = syncResult?.order.status ?? nextStatus;

    if (trackingNumber && trackingChanged) {
      await sendOrderUpdateEmailById({
        orderId,
        previousStatus,
        trackingSummary: syncResult?.trackingSummary ?? null,
        kind: "shipping",
      });
    } else if (effectiveStatus !== previousStatus) {
      await sendOrderUpdateEmailById({
        orderId,
        previousStatus,
        trackingSummary: syncResult?.trackingSummary ?? null,
        kind: "status",
      });
    }
  } catch (error) {
    console.error("Failed to send tracking update email:", error);
  }

  revalidateOrderPaths(orderId);
}

export async function syncOrderTrackingAction(orderId: string): Promise<void> {
  "use server";
  await requireAuthenticatedAdmin();

  try {
    const result = await syncOrderTrackingById(orderId);
    if (result?.statusChanged) {
      await sendOrderUpdateEmailById({
        orderId,
        previousStatus: result.previousStatus,
        trackingSummary: result.trackingSummary,
        kind: result.order.status === "shipped" ? "shipping" : "status",
      });
    }
  } catch (error) {
    console.error("Failed to sync tracking or send update email:", error);
  }

  revalidateOrderPaths(orderId);
}
