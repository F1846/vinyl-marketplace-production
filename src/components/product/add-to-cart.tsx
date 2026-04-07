"use client";

import { useState } from "react";
import { Product } from "@/types/product";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

interface AddToCartProps {
  product: Product;
}

export function AddToCart({ product }: AddToCartProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      productId: product.id,
      title: `${product.artist} - ${product.title}`,
      priceCents: product.priceCents,
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
      disabled={product.stockQuantity === 0}
    >
      {added ? (
        <>
          <Check className="h-5 w-5" /> Added to Cart
        </>
      ) : (
        <>
          <ShoppingCart className="h-5 w-5" /> Add to Cart
        </>
      )}
    </button>
  );
}
