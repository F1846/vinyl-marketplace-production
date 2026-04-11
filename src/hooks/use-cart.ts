"use client";

import { useCallback, useEffect, useState } from "react";

export interface CartItemType {
  productId: string;
  title: string;
  priceCents: number;
  quantity: number;
  maxQuantity: number;
  imageUrl?: string;
  format?: string;
}

const CART_KEY = "federico_shop_cart";
const CART_COOKIE_MAX_AGE_SECONDS = 60 * 10; 
const CART_TTL_MS = 10 * 60 * 1000;

type StoredCartPayload = {
  items: CartItemType[];
  expiresAt: number;
};

let cartCache: CartItemType[] = [];
const listeners = new Set<() => void>();
let activeSubscriberCount = 0;
let expirationIntervalId: number | null = null;
let storageListener: NonNullable<Window["onstorage"]> | null = null;

function clearCartCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${CART_KEY}=; path=/; max-age=0; samesite=lax`;
}

export function getReservedQuantity(items: CartItemType[], productId: string) {
  return items.reduce(
    (sum, item) => (item.productId === productId ? sum + item.quantity : sum),
    0
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function normalizeCartItem(value: unknown): CartItemType | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<CartItemType>;
  const priceCents = item.priceCents;
  const quantity = item.quantity;
  const maxQuantity = item.maxQuantity;
  if (typeof item.productId !== "string" || item.productId.trim().length === 0) {
    return null;
  }
  if (typeof item.title !== "string" || item.title.trim().length === 0) {
    return null;
  }
  if (!isNonNegativeInteger(priceCents)) {
    return null;
  }
  if (!isNonNegativeInteger(quantity) || quantity < 1) {
    return null;
  }
  if (!isNonNegativeInteger(maxQuantity)) {
    return null;
  }
  if (maxQuantity === 0) {
    return null;
  }

  return {
    productId: item.productId,
    title: item.title.trim(),
    priceCents,
    quantity: Math.min(quantity, maxQuantity),
    maxQuantity,
    imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : undefined,
    format: typeof item.format === "string" ? item.format : undefined,
  };
}

function readCartFromStorage(): CartItemType[] {
  try {
    const stored = localStorage.getItem(CART_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return parsed
        .map(normalizeCartItem)
        .filter((item): item is CartItemType => item !== null);
    }

    const payload = parsed as Partial<StoredCartPayload>;

    if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) {
      localStorage.removeItem(CART_KEY);
      clearCartCookie();
      return [];
    }

    if (typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) {
      localStorage.removeItem(CART_KEY);
      clearCartCookie();
      return [];
    }

    return payload.items
      .map(normalizeCartItem)
      .filter((item): item is CartItemType => item !== null);
  } catch {
    return [];
  }
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function ensureSharedSync() {
  if (typeof window === "undefined" || activeSubscriberCount > 0) {
    return;
  }

  storageListener = (event: StorageEvent) => {
    if (event.key === CART_KEY) {
      cartCache = readCartFromStorage();
      notifyListeners();
    }
  };

  window.addEventListener("storage", storageListener);

  expirationIntervalId = window.setInterval(() => {
    const nextCart = readCartFromStorage();
    const didExpire = cartCache.length > 0 && nextCart.length === 0;
    if (didExpire) {
      clearPersistedCart();
    }
  }, 30_000);
}

function teardownSharedSync() {
  if (typeof window === "undefined" || activeSubscriberCount > 0) {
    return;
  }

  if (storageListener) {
    window.removeEventListener("storage", storageListener);
    storageListener = null;
  }

  if (expirationIntervalId != null) {
    window.clearInterval(expirationIntervalId);
    expirationIntervalId = null;
  }
}

function persistCart(items: CartItemType[]) {
  const payload: StoredCartPayload = {
    items,
    expiresAt: Date.now() + CART_TTL_MS,
  };
  localStorage.setItem(CART_KEY, JSON.stringify(payload));
  const compactItems = items.map(({ productId, quantity }) => ({ productId, quantity }));
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${CART_KEY}=${encodeURIComponent(JSON.stringify(compactItems))}; path=/; max-age=${CART_COOKIE_MAX_AGE_SECONDS}; samesite=lax${isSecure ? "; secure" : ""}`;
}

function setCart(items: CartItemType[]) {
  cartCache = items;
  persistCart(cartCache);
  notifyListeners();
}

function clearPersistedCart() {
  cartCache = [];
  localStorage.removeItem(CART_KEY);
  clearCartCookie();
  notifyListeners();
}

export function useCart() {
  const [items, setItems] = useState<CartItemType[]>(cartCache);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    cartCache = readCartFromStorage();
    setItems(cartCache);

    const syncFromCache = () => {
      setItems([...cartCache]);
    };

    listeners.add(syncFromCache);
    ensureSharedSync();
    activeSubscriberCount += 1;

    return () => {
      listeners.delete(syncFromCache);
      activeSubscriberCount = Math.max(0, activeSubscriberCount - 1);
      teardownSharedSync();
    };
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItemType, "quantity"> & { quantity?: number }) => {
      if (!isClient || item.maxQuantity < 1) {
        return;
      }

      const requestedQuantity = Math.max(1, item.quantity ?? 1);
      const existing = cartCache.find((cartItem) => cartItem.productId === item.productId);

      if (existing) {
        setCart(
          cartCache.map((cartItem) =>
            cartItem.productId === item.productId
              ? {
                  ...cartItem,
                  ...item,
                  quantity: Math.min(cartItem.quantity + requestedQuantity, item.maxQuantity),
                }
              : cartItem
          )
        );
        return;
      }

      setCart([
        ...cartCache,
        {
          ...item,
          quantity: Math.min(requestedQuantity, item.maxQuantity),
        },
      ]);
    },
    [isClient]
  );

  const replaceItems = useCallback(
    (nextItems: CartItemType[]) => {
      if (!isClient) {
        return;
      }

      setCart(
        nextItems
          .map(normalizeCartItem)
          .filter((item): item is CartItemType => item !== null)
      );
    },
    [isClient]
  );

  const removeItem = useCallback(
    (productId: string) => {
      if (!isClient) {
        return;
      }

      setCart(cartCache.filter((item) => item.productId !== productId));
    },
    [isClient]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (!isClient) {
        return;
      }

      setCart(
        cartCache.flatMap((item) => {
          if (item.productId !== productId) {
            return [item];
          }

          if (item.maxQuantity < 1 || quantity < 1) {
            return [];
          }

          return [{ ...item, quantity: Math.min(quantity, item.maxQuantity) }];
        })
      );
    },
    [isClient]
  );

  const clearCart = useCallback(() => {
    if (!isClient) {
      return;
    }

    clearPersistedCart();
  }, [isClient]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPriceCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  return {
    items,
    addItem,
    replaceItems,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPriceCents,
    isLoaded: isClient,
  };
}
