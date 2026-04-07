"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatEuroFromCents } from "@/lib/money";

type ShippingCountry = {
  code: string;
  label: string;
};

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalItems, totalPriceCents, isLoaded } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingCountries, setShippingCountries] = useState<ShippingCountry[]>([]);
  const [shippingCountry, setShippingCountry] = useState("");
  const [shippingCents, setShippingCents] = useState(0);
  const [shippingLabel, setShippingLabel] = useState("Shipping");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const total = totalPriceCents + (items.length > 0 ? shippingCents : 0);

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    async function loadShippingCountries() {
      try {
        const res = await fetch("/api/shipping/countries");
        const json = await res.json();
        if (cancelled) return;

        const countries = Array.isArray(json.countries) ? json.countries : [];
        setShippingCountries(countries);

        if (!countries.length) {
          setShippingError("Shipping is not configured yet. Please contact the shop.");
          return;
        }

        setShippingCountry((current) => current || countries[0].code);
      } catch {
        if (!cancelled) {
          setShippingError("Shipping options are unavailable right now.");
        }
      }
    }

    void loadShippingCountries();

    return () => {
      cancelled = true;
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded || items.length === 0 || !shippingCountry) {
      setShippingCents(0);
      if (items.length === 0) {
        setShippingError(null);
      }
      return;
    }

    let cancelled = false;
    setShippingLoading(true);
    setShippingError(null);

    async function loadShippingQuote() {
      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shippingCountry,
            items: items.map((item) => ({
              id: item.productId,
              qty: item.quantity,
              price: item.priceCents,
            })),
          }),
        });

        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || !json.quote) {
          setShippingCents(0);
          setShippingLabel("Shipping");
          setShippingError(json.error?.message ?? "No shipping option is configured for this cart.");
          return;
        }

        setShippingCents(json.quote.totalCents);
        setShippingLabel(`Shipping to ${json.quote.countryLabel}`);
      } catch {
        if (!cancelled) {
          setShippingCents(0);
          setShippingLabel("Shipping");
          setShippingError("Could not calculate shipping right now.");
        }
      } finally {
        if (!cancelled) {
          setShippingLoading(false);
        }
      }
    }

    void loadShippingQuote();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, items, shippingCountry]);

  async function handleCheckout() {
    if (!shippingCountry) {
      setError("Choose a shipping country before checkout.");
      return;
    }

    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingCountry,
          items: items.map((item) => ({
            id: item.productId,
            qty: item.quantity,
            price: item.priceCents,
          })),
        }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setError(json.error?.message ?? json.error?.code ?? "Checkout failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

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
      <div className="space-y-4 lg:col-span-2">
        <h1 className="text-2xl font-bold text-foreground">
          Your Cart ({totalItems} item{totalItems !== 1 ? "s" : ""})
        </h1>
        {items.map((item) => (
          <div key={item.productId} className="card flex gap-4">
            <div className="h-24 w-24 flex-shrink-0 rounded bg-zinc-800" />
            <div className="flex-1">
              <Link
                href={`/products/${item.productId}`}
                className="text-foreground hover:text-accent"
              >
                <span className="font-medium">{item.title}</span>
              </Link>
              {item.format && (
                <span className="ml-2 text-xs capitalize text-muted">({item.format})</span>
              )}
              <div className="mt-2 flex items-center justify-between">
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
                    {formatEuroFromCents(item.priceCents * item.quantity)}
                  </span>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-muted transition-colors hover:text-danger"
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

      <div className="lg:col-span-1">
        <div className="card space-y-4 lg:sticky lg:top-8">
          <h2 className="text-lg font-bold text-foreground">Order Summary</h2>

          <div className="space-y-2">
            <label htmlFor="shipping-country" className="label">Shipping country</label>
            <select
              id="shipping-country"
              className="input"
              value={shippingCountry}
              onChange={(event) => setShippingCountry(event.target.value)}
              disabled={shippingCountries.length === 0}
            >
              {shippingCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label} ({country.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatEuroFromCents(totalPriceCents)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>{shippingLabel}</span>
              <span>{shippingLoading ? "Calculating..." : formatEuroFromCents(shippingCents)}</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex justify-between text-xl font-bold text-foreground">
              <span>Total</span>
              <span>{formatEuroFromCents(total)}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            className="btn-primary w-full text-base"
            disabled={checkingOut || shippingLoading || !!shippingError || !shippingCountry}
          >
            {checkingOut ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Redirecting to Checkout...
              </>
            ) : (
              <>
                Proceed to Checkout <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          {shippingError && <p className="text-center text-sm text-danger">{shippingError}</p>}
          {error && <p className="text-center text-sm text-danger">{error}</p>}

          <Link href="/catalog" className="btn-secondary w-full text-center">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
