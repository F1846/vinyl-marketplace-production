"use client";

import { useCallback } from "react";
import { CartItemType } from "./use-cart";

export function useStockCheck(cartItems: CartItemType[]) {
  const checkStock = useCallback(
    (serverStock: Record<string, number>) => {
      const issues: Array<{ productId: string; title: string; available: number; requested: number }> = [];

      for (const item of cartItems) {
        const available = serverStock[item.productId];
        if (available === undefined || available === 0) {
          issues.push({
            productId: item.productId,
            title: item.title,
            available: 0,
            requested: item.quantity,
          });
        } else if (available < item.quantity) {
          issues.push({
            productId: item.productId,
            title: item.title,
            available,
            requested: item.quantity,
          });
        }
      }

      return issues;
    },
    [cartItems]
  );

  return { checkStock };
}
