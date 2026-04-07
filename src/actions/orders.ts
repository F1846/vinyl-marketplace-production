"use server";

import { db } from "@/db";
import { schema } from "@/db";
import { eq } from "drizzle-orm";
import { isValidTransition, type OrderStatus } from "@/types/order";
import { revalidatePath } from "next/cache";

export async function updateOrderStatus(orderId: string, formData: FormData): Promise<void> {
  "use server";

  const newStatus = formData.get("newStatus");
  if (typeof newStatus !== "string" || newStatus.length === 0) return;

  const d = db();

  const order = await d.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
  });

  if (!order) return;

  const nextStatus = newStatus as OrderStatus;
  if (!isValidTransition(order.status as OrderStatus, nextStatus)) {
    return;
  }

  await d
    .update(schema.orders)
    .set({ status: nextStatus })
    .where(eq(schema.orders.id, orderId));

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
