"use server";

import { db } from "@/db";
import { schema } from "@/db";
import { eq } from "drizzle-orm";
import { isValidTransition } from "@/types/order";
import { revalidatePath } from "next/cache";

export async function updateOrderStatus(orderId: string, formData: FormData) {
  "use server";

  const newStatus = formData.get("newStatus") as string;
  if (!newStatus) return { error: "No status selected" };

  const d = db();

  const order = await d.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
  });

  if (!order) return { error: "Order not found" };

  if (!isValidTransition(order.status as Parameters<typeof isValidTransition>[0], newStatus as Parameters<typeof isValidTransition>[1])) {
    return { error: `Invalid transition from ${order.status} to ${newStatus}` };
  }

  await d
    .update(schema.orders)
    .set({ status: newStatus as "pending" | "processing" | "shipped" | "delivered" | "cancelled" })
    .where(eq(schema.orders.id, orderId));

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}
