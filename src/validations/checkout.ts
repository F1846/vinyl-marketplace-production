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

export const pickupCheckoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1),
  customerName: z.string().trim().min(2).max(255),
  customerEmail: z.string().trim().email(),
  note: z.string().trim().max(500).optional(),
});

export const paypalCaptureSchema = z.object({
  token: z.string().trim().min(1),
  state: z.string().trim().min(1),
});
