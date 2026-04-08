import { z } from "zod";

export const checkoutItemSchema = z.object({
  id: z.string().uuid(),
  qty: z.number().int().min(1).max(10),
  price: z.number().int().min(0),
});

const countryCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/);

const shippingDetailsShape = {
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  shippingCountry: countryCodeSchema,
  street: z.string().trim().min(2).max(255),
  houseNumber: z.string().trim().min(1).max(32),
  postalCode: z.string().trim().min(2).max(32),
  city: z.string().trim().min(2).max(120),
  phoneNumber: z.string().trim().min(6).max(32),
  additionalInfo: z.string().trim().max(255).optional().default(""),
};

function validateConfirmedEmail(
  input: { email: string; confirmEmail: string },
  ctx: z.RefinementCtx
) {
  if (input.email.trim().toLowerCase() !== input.confirmEmail.trim().toLowerCase()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmEmail"],
      message: "Email addresses do not match.",
    });
  }
}

export const shippingDetailsSchema = z.object(shippingDetailsShape);

export type ShippingDetailsInput = z.infer<typeof shippingDetailsSchema>;

export const shippingQuoteSchema = z.object({
  items: z.array(checkoutItemSchema).min(1),
  shippingCountry: countryCodeSchema,
});

export const checkoutContactSchema = z
  .object({
    ...shippingDetailsShape,
    confirmEmail: z.string().trim().email(),
  })
  .superRefine(validateConfirmedEmail);

export type CheckoutContactInput = z.infer<typeof checkoutContactSchema>;

export const checkoutSchema = z
  .object({
    items: z.array(checkoutItemSchema).min(1),
    ...shippingDetailsShape,
    confirmEmail: z.string().trim().email(),
  })
  .superRefine(validateConfirmedEmail);

export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;
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
