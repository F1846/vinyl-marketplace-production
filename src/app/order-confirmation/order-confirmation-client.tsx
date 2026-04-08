"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

type OrderConfirmationClientProps = {
  sessionId: string | null;
  orderNumber: string | null;
  paymentMethod: string | null;
};

export function OrderConfirmationClient({
  sessionId,
  orderNumber,
  paymentMethod,
}: OrderConfirmationClientProps) {
  const { clearCart } = useCart();

  useEffect(() => {
    if (sessionId || orderNumber) {
      clearCart();
    }
  }, [clearCart, orderNumber, sessionId]);

  const title = useMemo(() => {
    if (paymentMethod === "pickup") {
      return "Pickup reserved";
    }
    return "Order confirmed";
  }, [paymentMethod]);

  const body = useMemo(() => {
    if (paymentMethod === "pickup") {
      return "Your items are reserved. We will contact you by email to arrange collection.";
    }
    if (paymentMethod === "paypal") {
      return "Your PayPal payment was captured successfully. We will send a confirmation email shortly.";
    }
    return "Your payment was successful. We will send you a confirmation email shortly.";
  }, [paymentMethod]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8 text-center">
      <div className="flex justify-center">
        <CheckCircle className="h-16 w-16 text-success" />
      </div>
      <h1 className="font-serif text-4xl text-foreground">{title}</h1>
      <p className="text-lg text-muted">{body}</p>

      {orderNumber && (
        <div className="card space-y-2 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Order number
          </p>
          <p className="font-mono text-lg text-foreground">{orderNumber}</p>
        </div>
      )}

      <div className="card space-y-3 text-left">
        <h2 className="font-serif text-2xl text-foreground">What happens next</h2>
        <ul className="space-y-2 text-sm leading-7 text-muted">
          <li>1. You will receive a confirmation email with your order number.</li>
          <li>2. We will prepare your order or arrange pickup details.</li>
          <li>3. Tracking is added once shipped.</li>
        </ul>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Link href="/track-order" className="btn-secondary">
          Track your order
        </Link>
        <Link href="/catalog" className="btn-primary">
          Continue shopping <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
