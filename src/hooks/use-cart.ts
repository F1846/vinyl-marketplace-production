"use client";

import { useEffect, useState, useCallback } from "react";

export interface CartItemType {
  productId: string;
  title: string;
  priceCents: number;
  quantity: number;
  maxQuantity: number;
  imageUrl?: string;
  format?: string;
}

const CART_KEY = "f1846_cart";

export function useCart() {
  const [items, setItems] = useState<CartItemType[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem(CART_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // ignore corrupted cart
    }
  }, []);

  const save = useCallback((newItems: CartItemType[]) => {
    setItems(newItems);
    localStorage.setItem(CART_KEY, JSON.stringify(newItems));
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItemType, "quantity"> & { quantity?: number }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (existing) {
          return prev.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: Math.min(i.quantity + 1, i.maxQuantity) }
              : i
          );
        }
        return [...prev, { ...item, quantity: item.quantity ?? 1 }];
      });
    },
    []
  );

  // Force re-save after state update
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    }
  }, [items, isClient]);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQuantity)) }
          : i
      ).filter((i) => i.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_KEY);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPriceCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPriceCents,
    isLoaded: isClient,
  };
}
