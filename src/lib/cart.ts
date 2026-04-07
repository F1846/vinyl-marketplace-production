// Cart is stored in localStorage as: { items: [{ productId, quantity }] }
// Server-side we use cookies instead for SSR compatibility

import { cookies } from "next/headers";

export interface CartItem {
  productId: string;
  quantity: number;
}

const COOKIE_NAME = "f1846_cart";

export async function getCartFromCookie(): Promise<CartItem[]> {
  const cookieStore = await cookies();
  const cartCookie = cookieStore.get(COOKIE_NAME);
  if (!cartCookie?.value) return [];
  try {
    return JSON.parse(cartCookie.value) as CartItem[];
  } catch {
    return [];
  }
}
