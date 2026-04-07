"use server";

import { cookies } from "next/headers";
import { z } from "zod";

const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(10),
});

const COOKIE_NAME = "f1846_cart";

export async function getCart(): Promise<z.infer<typeof cartItemSchema>[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return cartItemSchema.array().parse(parsed);
  } catch {
    return [];
  }
}

export async function addToCart(productId: string) {
  const current = await getCart();
  const existing = current.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + 1, 10);
  } else {
    current.push({ productId, quantity: 1 });
  }
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(current), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return current;
}

export async function removeFromCart(productId: string) {
  const current = await getCart();
  const updated = current.filter((i) => i.productId !== productId);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(updated), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return updated;
}

export async function updateCartQuantity(productId: string, quantity: number) {
  const current = await getCart();
  const updated = current
    .map((i) =>
      i.productId === productId
        ? { ...i, quantity: Math.max(0, Math.min(quantity, 10)) }
        : i
    )
    .filter((i) => i.quantity > 0);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(updated), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return updated;
}

export async function clearCart() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
