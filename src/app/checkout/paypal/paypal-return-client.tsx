"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useDictionary } from "@/components/providers/locale-provider";
import { useCart } from "@/hooks/use-cart";

type PayPalReturnClientProps = {
  token: string | null;
  state: string | null;
};

export function PayPalReturnClient({ token, state }: PayPalReturnClientProps) {
  const dictionary = useDictionary();
  const router = useRouter();
  const { clearCart } = useCart();
  const [message, setMessage] = useState<string>(dictionary.paypalReturn.capturing);

  const isReady = useMemo(() => Boolean(token && state), [token, state]);

  useEffect(() => {
    if (!isReady) {
      setMessage(dictionary.paypalReturn.missing);
      return;
    }

    let cancelled = false;

    async function captureOrder() {
      const res = await fetch("/api/checkout/paypal/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, state }),
      });
      const json = await res.json();

      if (cancelled) {
        return;
      }

      if (!res.ok || !json.orderNumber) {
        setMessage(json.error?.message ?? dictionary.paypalReturn.failed);
        return;
      }

      clearCart();
      router.replace(
        `/order-confirmation?order_number=${encodeURIComponent(json.orderNumber)}&payment=paypal`
      );
    }

    void captureOrder();

    return () => {
      cancelled = true;
    };
  }, [clearCart, dictionary.paypalReturn.failed, dictionary.paypalReturn.missing, isReady, router, state, token]);

  return (
    <div className="card mx-auto max-w-xl space-y-4 py-12 text-center">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
      <h1 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground">
        {dictionary.paypalReturn.title}
      </h1>
      <p className="text-sm leading-7 text-muted">{message}</p>
    </div>
  );
}
