"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

export default function OrderConfirmationPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("session_id")) {
      clearCart();
    }
  }, [clearCart]);

  return (
    <div className="mx-auto max-w-2xl text-center space-y-6 py-8">
      <div className="flex justify-center">
        <CheckCircle className="h-16 w-16 text-success" />
      </div>
      <h1 className="text-3xl font-bold text-foreground">Order Confirmed!</h1>
      <p className="text-lg text-muted">
        Your payment was successful. We&apos;ll send you a confirmation email shortly.
      </p>
      <div className="card space-y-3 text-left">
        <h2 className="font-semibold text-foreground">What&apos;s next?</h2>
        <ul className="space-y-2 text-sm text-muted">
          <li>1. You&apos;ll receive an order confirmation email with your order number</li>
          <li>2. We&apos;ll pack your order and get it shipped within 1-2 business days</li>
          <li>3. You&apos;ll receive tracking information once it ships</li>
        </ul>
      </div>
      <div className="flex gap-4 justify-center pt-4">
        <Link href="/track-order" className="btn-secondary">
          Track Your Order
        </Link>
        <Link href="/catalog" className="btn-primary">
          Continue Shopping <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
