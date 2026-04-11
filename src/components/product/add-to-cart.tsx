"use client";

import { useState } from "react";
import { Product } from "@/types/product";
import { ShoppingCart, Check } from "lucide-react";
import { useDictionary } from "@/components/providers/locale-provider";
import { getReservedQuantity, useCart } from "@/hooks/use-cart";

interface AddToCartProps {
  product: Product;
  imageUrl?: string;
}

export function AddToCart({ product, imageUrl }: AddToCartProps) {
  const dictionary = useDictionary();
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);
  const reservedQuantity = getReservedQuantity(items, product.id);
  const availableStock = Math.max(product.stockQuantity - reservedQuantity, 0);

  function handleAdd() {
    if (availableStock < 1) {
      return;
    }

    addItem({
      productId: product.id,
      title: `${product.artist} - ${product.title}`,
      priceCents: product.priceCents,
      imageUrl,
      format: product.format,
      maxQuantity: product.stockQuantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      onClick={handleAdd}
      className="btn-primary w-full text-base"
      disabled={availableStock === 0}
    >
      {availableStock === 0 ? (
        dictionary.product.soldOutButton
      ) : added ? (
        <>
          <Check className="h-5 w-5" /> {dictionary.addToCart.added}
        </>
      ) : (
        <>
          <ShoppingCart className="h-5 w-5" /> {dictionary.addToCart.add}
        </>
      )}
    </button>
  );
}
