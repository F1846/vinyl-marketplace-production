"use client";

import Link from "next/link";
import { useCart } from "@/hooks/use-cart";
import { Loader2, Trash2, ArrowLeft, ArrowRight } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalItems, totalPriceCents, isLoaded } = useCart();
  const shippingCents = parseInt(process.env.NEXT_PUBLIC_SHIPPING_CENTS ?? "899", 10);
  const total = totalPriceCents + (items.length > 0 ? shippingCents : 0);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card py-16 text-center">
        <h2 className="text-2xl font-bold text-foreground">Your Cart is Empty</h2>
        <p className="mt-2 text-muted">Browse our catalog to find records you love.</p>
        <Link href="/catalog" className="btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> Browse Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Cart items */}
      <div className="lg:col-span-2 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">
          Your Cart ({totalItems} item{totalItems !== 1 ? "s" : ""})
        </h1>
        {items.map((item) => (
          <div key={item.productId} className="card flex gap-4">
            {/* Image placeholder */}
            <div className="h-24 w-24 flex-shrink-0 rounded bg-background" />
            <div className="flex-1">
              <Link href={`/products/${item.productId}`} className="text-foreground hover:text-accent">
                <span className="font-medium">{item.title}</span>
              </Link>
              {item.format && <span className="ml-2 text-xs text-muted capitalize">({item.format})</span>}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-border bg-background text-foreground hover:bg-surface-hover"
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-border bg-background text-foreground hover:bg-surface-hover"
                    disabled={item.quantity >= item.maxQuantity}
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-accent">
                    ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-muted hover:text-danger transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div className="lg:col-span-1">
        <div className="card space-y-4 lg:sticky lg:top-8">
          <h2 className="text-lg font-bold text-foreground">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>${(totalPriceCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Shipping (flat rate)</span>
              <span>${(shippingCents / 100).toFixed(2)}</span>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <div className="flex justify-between text-xl font-bold text-foreground">
              <span>Total</span>
              <span>${(total / 100).toFixed(2)}</span>
            </div>
          </div>
          <form action="/api/checkout/create" method="POST" className="space-y-2">
            <input type="hidden" name="cart" value={JSON.stringify(items.map(i => ({ id: i.productId, qty: i.quantity, price: i.priceCents })))} />
            <button type="submit" className="btn-primary w-full text-base">
              Proceed to Checkout <ArrowRight className="h-5 w-5" />
            </button>
          </form>
          <Link href="/catalog" className="btn-secondary w-full text-center">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
