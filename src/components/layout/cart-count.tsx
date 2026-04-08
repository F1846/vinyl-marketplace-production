"use client";

import { useCart } from "@/hooks/use-cart";

export function CartCount() {
  const { totalItems, isLoaded } = useCart();

  if (!isLoaded || totalItems <= 0) {
    return null;
  }

  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-background">
      {totalItems > 99 ? "99+" : totalItems}
    </span>
  );
}
