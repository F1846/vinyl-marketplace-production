import { z } from "zod";

export const checkoutItemSchema = z.object({
  id: z.string().uuid(),
  qty: z.number().int().min(1).max(10),
  price: z.number().int().min(0),
});

export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1),
  shippingCountry: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
