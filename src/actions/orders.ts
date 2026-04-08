"use server";

import { db } from "@/db";
import { schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import {
  fetchTrackingSummary,
  isTrackingSyncConfigured,
  syncOrderTrackingById,
} from "@/lib/order-tracking";
import {
  sendManualOrderMessageById,
  sendOrderUpdateEmailById,
} from "@/lib/order-notifications";
import { allOrderStatuses, getOrderStatusRank, type OrderStatus } from "@/types/order";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateOrderPaths(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/track-order");
}

function buildOrderDetailPath(orderId: string, query?: string) {
  return query ? `/admin/orders/${orderId}?${query}` : `/admin/orders/${orderId}`;
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
    order.status !== "delivered"
  ) {
    const targetStatus = isTrackingSyncConfigured() ? "processing" : "shipped";

    if (getOrderStatusRank(nextStatus) < getOrderStatusRank(targetStatus)) {
      nextStatus = targetStatus;
    }
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

export async function updateOrderVat(orderId: string, formData: FormData): Promise<void> {
  "use server";
  await requireAuthenticatedAdmin();

  const vatRateRaw = formData.get("vatRate");
  const vatRateInput = typeof vatRateRaw === "string" ? vatRateRaw.trim() : "";
  const vatRateValue =
    vatRateInput.length > 0 ? Number.parseFloat(vatRateInput.replace(",", ".")) : 0;

  if (!Number.isFinite(vatRateValue) || vatRateValue < 0 || vatRateValue > 100) {
    return;
  }

  const d = db();
  const order = await d.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
  });

  if (!order) return;

  const taxableBaseCents = Math.max(order.subtotalCents + order.shippingCents, 0);
  const normalizedVatRate = vatRateValue > 0 ? vatRateValue : 0;
  const nextTaxCents = Math.round((taxableBaseCents * normalizedVatRate) / 100);
  const nextTotalCents = order.subtotalCents + order.shippingCents + nextTaxCents;

  if (order.taxCents === nextTaxCents && order.totalCents === nextTotalCents) {
    return;
  }

  await d
    .update(schema.orders)
    .set({
      taxCents: nextTaxCents,
      totalCents: nextTotalCents,
      updatedAt: new Date(),
    })
    .where(eq(schema.orders.id, orderId));

  revalidateOrderPaths(orderId);
}

export async function sendManualOrderEmail(orderId: string, formData: FormData): Promise<void> {
  "use server";
  await requireAuthenticatedAdmin();

  const senderRaw = formData.get("sender");
  const subjectRaw = formData.get("subject");
  const messageRaw = formData.get("message");
  const sender =
    senderRaw === "support" || senderRaw === "orders" ? senderRaw : "support";
  const subject = typeof subjectRaw === "string" ? subjectRaw.trim() : "";
  const message = typeof messageRaw === "string" ? messageRaw.trim() : "";

  if (!message) {
    redirect(buildOrderDetailPath(orderId, "email=missing"));
  }

  let sent = false;
  try {
    sent = await sendManualOrderMessageById({
      orderId,
      sender,
      subject,
      message,
    });
  } catch (error) {
    console.error("Failed to send manual customer email:", error);
    redirect(buildOrderDetailPath(orderId, "email=failed"));
  }

  redirect(buildOrderDetailPath(orderId, sent ? "email=sent" : "email=missing"));
}
