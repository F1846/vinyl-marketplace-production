import { z } from "zod";

export const orderStatusUpdateSchema = z.object({
  orderId: z.string().uuid(),
  newStatus: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
});

export const orderLookupSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  email: z.string().email("Valid email is required"),
});

export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
export type OrderLookupInput = z.infer<typeof orderLookupSchema>;
