"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useDictionary } from "@/components/providers/locale-provider";
import { useCart } from "@/hooks/use-cart";

type OrderConfirmationClientProps = {
  sessionId: string | null;
  orderNumber: string | null;
  paymentMethod: string | null;
  invoiceUrl: string | null;
};

export function OrderConfirmationClient({
  sessionId,
  orderNumber,
  paymentMethod,
  invoiceUrl,
}: OrderConfirmationClientProps) {
  const dictionary = useDictionary();
  const { clearCart } = useCart();

  useEffect(() => {
    if (sessionId || orderNumber) {
      clearCart();
    }
  }, [clearCart, orderNumber, sessionId]);

  const title = useMemo(() => {
    if (paymentMethod === "pickup") {
      return dictionary.orderConfirmation.pickupReserved;
    }
    return dictionary.orderConfirmation.orderConfirmed;
  }, [dictionary.orderConfirmation.orderConfirmed, dictionary.orderConfirmation.pickupReserved, paymentMethod]);

  const body = useMemo(() => {
    if (paymentMethod === "pickup") {
      return dictionary.orderConfirmation.pickupBody;
    }
    if (paymentMethod === "paypal") {
      return dictionary.orderConfirmation.paypalBody;
    }
    return dictionary.orderConfirmation.successBody;
  }, [
    dictionary.orderConfirmation.paypalBody,
    dictionary.orderConfirmation.pickupBody,
    dictionary.orderConfirmation.successBody,
    paymentMethod,
  ]);

  const nextSteps = useMemo(() => {
    if (paymentMethod === "pickup") {
      return [
        dictionary.orderConfirmation.step1,
        dictionary.orderConfirmation.pickupStep2,
      ];
    }

    return [
      dictionary.orderConfirmation.step1,
      dictionary.orderConfirmation.step2,
      dictionary.orderConfirmation.step3,
    ];
  }, [
    dictionary.orderConfirmation.pickupStep2,
    dictionary.orderConfirmation.step1,
    dictionary.orderConfirmation.step2,
    dictionary.orderConfirmation.step3,
    paymentMethod,
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8 text-center">
      <div className="flex justify-center">
        <CheckCircle className="h-16 w-16 text-success" />
      </div>
      <h1 className="font-sans text-4xl font-bold tracking-[-0.04em] text-foreground">
        {title}
      </h1>
      <p className="text-lg text-muted">{body}</p>

      {orderNumber && (
        <div className="card space-y-2 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {dictionary.orderConfirmation.orderNumber}
          </p>
          <p className="font-mono text-lg text-foreground">{orderNumber}</p>
        </div>
      )}

      <div className="card space-y-3 text-left">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.orderConfirmation.whatNext}
        </h2>
        <ul className="space-y-2 text-sm leading-7 text-muted">
          {nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Link href="/track-order" className="btn-secondary">
          {dictionary.orderConfirmation.trackOrder}
        </Link>
        {invoiceUrl && (
          <a href={invoiceUrl} className="btn-secondary">
            {dictionary.orderConfirmation.downloadInvoice}
          </a>
        )}
        <Link href="/catalog" className="btn-primary">
          {dictionary.orderConfirmation.continueShopping} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
