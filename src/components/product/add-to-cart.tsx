"use client";

import { useState } from "react";
import { Product } from "@/types/product";
import { ShoppingCart, Check } from "lucide-react";
import { useDictionary } from "@/components/providers/locale-provider";
import { useCart } from "@/hooks/use-cart";

interface AddToCartProps {
  product: Product;
  imageUrl?: string;
}

export function AddToCart({ product, imageUrl }: AddToCartProps) {
  const dictionary = useDictionary();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
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
      disabled={product.stockQuantity === 0}
    >
      {added ? (
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
