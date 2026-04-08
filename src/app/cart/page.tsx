"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Loader2,
  MapPin,
  Trash2,
  Wallet,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatEuroFromCents } from "@/lib/money";
import { siteConfig } from "@/lib/site";

type ShippingCountry = {
  code: string;
  label: string;
};

type RefreshedCartItem = {
  productId: string;
  title: string;
  priceCents: number;
  maxQuantity: number;
  imageUrl?: string;
  format?: string;
};

type CheckoutMode = "card" | "paypal" | "pickup";
const PAYPAL_ENABLED = process.env.NEXT_PUBLIC_PAYPAL_ENABLED === "true";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    replaceItems,
    removeItem,
    updateQuantity,
    totalItems,
    totalPriceCents,
    isLoaded,
  } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [shippingCountries, setShippingCountries] = useState<ShippingCountry[]>([]);
  const [shippingCountry, setShippingCountry] = useState("");
  const [shippingCents, setShippingCents] = useState(0);
  const [shippingLabel, setShippingLabel] = useState("Shipping");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("card");
  const [pickupName, setPickupName] = useState("");
  const [pickupEmail, setPickupEmail] = useState("");
  const [pickupNote, setPickupNote] = useState("");

  const isPickup = checkoutMode === "pickup";
  const total = totalPriceCents + (isPickup || items.length === 0 ? 0 : shippingCents);
  const checkoutOptions = [
    {
      mode: "card" as const,
      title: "Credit or debit card",
      description: "Stripe-hosted secure card checkout",
      icon: CreditCard,
    },
    ...(PAYPAL_ENABLED
      ? [
          {
            mode: "paypal" as const,
            title: "PayPal",
            description: "Approve the order on PayPal and return here",
            icon: Wallet,
          },
        ]
      : []),
    {
      mode: "pickup" as const,
      title: "Local pickup",
      description: `Reserve now and collect from ${siteConfig.pickupLabel}`,
      icon: MapPin,
    },
  ];

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
    if (!isLoaded || items.length === 0) {
      setCartNotice(null);
      return;
    }

    let cancelled = false;

    async function refreshCartSnapshot() {
      try {
        const res = await fetch("/api/cart/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productIds: items.map((item) => item.productId),
          }),
        });
        const json = await res.json();
        if (cancelled || !res.ok || !Array.isArray(json.items)) {
          return;
        }

        const freshItems = new Map<string, RefreshedCartItem>(
          (json.items as RefreshedCartItem[]).map((item) => [item.productId, item])
        );

        const removedTitles: string[] = [];
        let wasAdjusted = false;
        const nextItems = items.flatMap((item) => {
          const freshItem = freshItems.get(item.productId);
          if (!freshItem || freshItem.maxQuantity < 1) {
            removedTitles.push(item.title);
            wasAdjusted = true;
            return [];
          }

          const nextQuantity = Math.min(item.quantity, freshItem.maxQuantity);
          if (
            nextQuantity !== item.quantity ||
            freshItem.priceCents !== item.priceCents ||
            freshItem.maxQuantity !== item.maxQuantity ||
            freshItem.title !== item.title ||
            freshItem.imageUrl !== item.imageUrl ||
            freshItem.format !== item.format
          ) {
            wasAdjusted = true;
          }

          return [{ ...item, ...freshItem, quantity: nextQuantity }];
        });

        if (wasAdjusted) {
          replaceItems(nextItems);
          if (removedTitles.length > 0) {
            setCartNotice(
              `${removedTitles.join(", ")} ${
                removedTitles.length === 1 ? "was" : "were"
              } removed because it is no longer available.`
            );
          } else {
            setCartNotice("Your cart was updated to match the latest stock and prices.");
          }
        } else {
          setCartNotice(null);
        }
      } catch {
        if (!cancelled) {
          setCartNotice(null);
        }
      }
    }

    void refreshCartSnapshot();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, items, replaceItems]);

  useEffect(() => {
    if (isPickup) {
      setShippingCents(0);
      setShippingLabel("Local pickup");
      setShippingError(null);
      return;
    }

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
  }, [isLoaded, isPickup, items, shippingCountry]);

  const checkoutPayload = useMemo(
    () => ({
      items: items.map((item) => ({
        id: item.productId,
        qty: item.quantity,
        price: item.priceCents,
      })),
    }),
    [items]
  );

  async function handleCheckout() {
    if (!isPickup && !shippingCountry) {
      setError("Choose a shipping country before checkout.");
      return;
    }

    if (isPickup && (!pickupName.trim() || !pickupEmail.trim())) {
      setError("Enter your name and email for local pickup.");
      return;
    }

    setCheckingOut(true);
    setError(null);

    try {
      const endpoint =
        checkoutMode === "card"
          ? "/api/checkout/create"
          : checkoutMode === "paypal"
            ? "/api/checkout/paypal/create"
            : "/api/checkout/pickup";

      const body =
        checkoutMode === "pickup"
          ? {
              ...checkoutPayload,
              customerName: pickupName.trim(),
              customerEmail: pickupEmail.trim(),
              note: pickupNote.trim(),
            }
          : {
              ...checkoutPayload,
              shippingCountry,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
        return;
      }

      if (json.orderNumber) {
        router.push(`/order-confirmation?order_number=${encodeURIComponent(json.orderNumber)}&payment=pickup`);
        return;
      }

      setError(json.error?.message ?? json.error?.code ?? "Checkout failed");
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
        <h2 className="font-serif text-3xl text-foreground">Your cart is empty</h2>
        <p className="mt-2 text-muted">Browse the racks and add a few records you love.</p>
        <Link href="/catalog" className="btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> Browse catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Cart</p>
          <h1 className="mt-2 font-serif text-4xl text-foreground">
            Your selection ({totalItems} item{totalItems !== 1 ? "s" : ""})
          </h1>
        </div>

        {cartNotice && (
          <div className="rounded-3xl border border-border bg-white px-4 py-3 text-sm text-foreground">
            {cartNotice}
          </div>
        )}

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="card flex gap-4">
              <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-[1.25rem] bg-[#ebe8e1]">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : null}
              </div>
              <div className="flex-1">
                <Link href={`/products/${item.productId}`} className="font-serif text-2xl text-foreground hover:text-accent">
                  {item.title}
                </Link>
                {item.format && (
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">{item.format}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-surface-hover"
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-surface-hover"
                      disabled={item.quantity >= item.maxQuantity}
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-foreground">
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
      </div>

      <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
        <div className="card space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Checkout
            </p>
            <h2 className="mt-2 font-serif text-3xl text-foreground">Choose how to finish</h2>
          </div>

          <div className="grid gap-3">
            {checkoutOptions.map((option) => (
              <button
                key={option.mode}
                type="button"
                onClick={() => setCheckoutMode(option.mode)}
                className={`rounded-[1.5rem] border p-4 text-left transition ${
                  checkoutMode === option.mode
                    ? "border-foreground bg-white shadow-soft"
                    : "border-border bg-background hover:border-foreground/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <option.icon className="mt-0.5 h-5 w-5 text-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{option.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{option.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!PAYPAL_ENABLED && (
            <p className="text-xs leading-6 text-muted">
              PayPal can be enabled later by adding PayPal credentials and setting
              <span className="font-mono text-foreground"> NEXT_PUBLIC_PAYPAL_ENABLED=true</span>.
            </p>
          )}

          {isPickup ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="pickup-name" className="label">Name</label>
                <input
                  id="pickup-name"
                  className="input"
                  value={pickupName}
                  onChange={(event) => setPickupName(event.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label htmlFor="pickup-email" className="label">Email</label>
                <input
                  id="pickup-email"
                  className="input"
                  value={pickupEmail}
                  onChange={(event) => setPickupEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </div>
              <div>
                <label htmlFor="pickup-note" className="label">Pickup note</label>
                <textarea
                  id="pickup-note"
                  className="input min-h-28"
                  value={pickupNote}
                  onChange={(event) => setPickupNote(event.target.value)}
                  placeholder={siteConfig.pickupNote}
                />
              </div>
            </div>
          ) : (
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
          )}

          <div className="space-y-3 rounded-[1.5rem] border border-border bg-background p-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatEuroFromCents(totalPriceCents)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>{shippingLabel}</span>
              <span>
                {isPickup
                  ? "0.00 EUR"
                  : shippingLoading
                    ? "Calculating..."
                    : formatEuroFromCents(shippingCents)}
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between text-xl font-semibold text-foreground">
                <span>Total</span>
                <span>{formatEuroFromCents(total)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            className="btn-primary w-full text-base"
            disabled={
              checkingOut ||
              (!isPickup && (shippingLoading || !!shippingError || !shippingCountry))
            }
          >
            {checkingOut ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Redirecting...
              </>
            ) : checkoutMode === "paypal" ? (
              <>
                Continue with PayPal <ArrowRight className="h-5 w-5" />
              </>
            ) : checkoutMode === "pickup" ? (
              <>
                Reserve for pickup <ArrowRight className="h-5 w-5" />
              </>
            ) : (
              <>
                Proceed to card checkout <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          {shippingError && !isPickup && (
            <p className="text-center text-sm text-danger">{shippingError}</p>
          )}
          {error && <p className="text-center text-sm text-danger">{error}</p>}

          <Link href="/catalog" className="btn-secondary w-full text-center">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
