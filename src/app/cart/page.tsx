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
import {
  checkoutContactSchema,
  type CheckoutContactInput,
} from "@/validations/checkout";
import { useDictionary } from "@/components/providers/locale-provider";

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
type ShippingFormState = {
  firstName: string;
  lastName: string;
  email: string;
  confirmEmail: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  phoneCountryCode: string;
  phoneLocalNumber: string;
  additionalInfo: string;
};
type ShippingFieldName =
  | "firstName"
  | "lastName"
  | "email"
  | "confirmEmail"
  | "shippingCountry"
  | "street"
  | "houseNumber"
  | "postalCode"
  | "city"
  | "phoneNumber"
  | "additionalInfo";

type PhoneCodeOption = {
  countryCode: string;
  dialCode: string;
  label: string;
};

const PAYPAL_ENABLED = process.env.NEXT_PUBLIC_PAYPAL_ENABLED === "true";
const PHONE_DIAL_CODES: Record<string, string> = {
  AT: "+43",
  AU: "+61",
  BE: "+32",
  BG: "+359",
  CA: "+1",
  CH: "+41",
  CY: "+357",
  CZ: "+420",
  DE: "+49",
  DK: "+45",
  EE: "+372",
  ES: "+34",
  FI: "+358",
  FR: "+33",
  GB: "+44",
  GR: "+30",
  HR: "+385",
  HU: "+36",
  IE: "+353",
  IT: "+39",
  LT: "+370",
  LU: "+352",
  LV: "+371",
  MT: "+356",
  NL: "+31",
  NO: "+47",
  PL: "+48",
  PT: "+351",
  RO: "+40",
  SE: "+46",
  SI: "+386",
  SK: "+421",
  US: "+1",
};
const EMPTY_SHIPPING_FORM: ShippingFormState = {
  firstName: "",
  lastName: "",
  email: "",
  confirmEmail: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  phoneCountryCode: "",
  phoneLocalNumber: "",
  additionalInfo: "",
};

function getPhoneCodeForCountry(countryCode: string) {
  return PHONE_DIAL_CODES[countryCode] ?? "";
}

function getPhoneCodeOptions(countries: ShippingCountry[]): PhoneCodeOption[] {
  const fallbackCountries: ShippingCountry[] = [
    { code: "DE", label: "Germany" },
    { code: "IT", label: "Italy" },
    { code: "FR", label: "France" },
    { code: "NL", label: "Netherlands" },
    { code: "GB", label: "United Kingdom" },
    { code: "US", label: "United States" },
  ];

  const source = countries.length > 0 ? countries : fallbackCountries;

  return source.map((country) => ({
    countryCode: country.code,
    dialCode: getPhoneCodeForCountry(country.code) || `+${country.code}`,
    label: `${country.label} (${getPhoneCodeForCountry(country.code) || country.code})`,
  }));
}

function getFriendlyFieldError(
  field: ShippingFieldName,
  messages?: string[]
) {
  const firstMessage = messages?.[0] ?? "";

  if (!firstMessage) {
    return "";
  }

  switch (field) {
    case "email":
      return "Enter a valid email address.";
    case "confirmEmail":
      return firstMessage.includes("match") ? "Emails do not match." : "Enter the same email again.";
    case "shippingCountry":
      return "Choose a country.";
    case "phoneNumber":
      return "Fill in this field.";
    case "additionalInfo":
      return "Keep this a bit shorter.";
    default:
      return "Fill in this field.";
  }
}

function fieldClassName(error?: string) {
  return `input ${error ? "border-danger focus:border-danger" : ""}`;
}

export default function CartPage() {
  const dictionary = useDictionary();
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
  const [shippingLabel, setShippingLabel] = useState<string>(dictionary.cart.shipping);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("card");
  const [shippingForm, setShippingForm] = useState<ShippingFormState>(EMPTY_SHIPPING_FORM);
  const [shippingFieldErrors, setShippingFieldErrors] = useState<
    Partial<Record<ShippingFieldName, string>>
  >({});
  const [pickupName, setPickupName] = useState("");
  const [pickupEmail, setPickupEmail] = useState("");
  const [pickupNote, setPickupNote] = useState("");

  const isPickup = checkoutMode === "pickup";
  const total = totalPriceCents + (isPickup || items.length === 0 ? 0 : shippingCents);
  const phoneCodeOptions = useMemo(
    () => getPhoneCodeOptions(shippingCountries),
    [shippingCountries]
  );
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
      setShippingLabel(siteConfig.pickupLabel);
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
          setShippingLabel(dictionary.cart.shipping);
          setShippingError(json.error?.message ?? "No shipping option is configured for this cart.");
          return;
        }

        setShippingCents(json.quote.totalCents);
        setShippingLabel(`Shipping to ${json.quote.countryLabel}`);
      } catch {
        if (!cancelled) {
          setShippingCents(0);
          setShippingLabel(dictionary.cart.shipping);
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
  }, [dictionary.cart.shipping, isLoaded, isPickup, items, shippingCountry]);

  useEffect(() => {
    if (!shippingCountry || shippingForm.phoneCountryCode) {
      return;
    }

    const dialCode = getPhoneCodeForCountry(shippingCountry);
    if (!dialCode) {
      return;
    }

    setShippingForm((current) => ({
      ...current,
      phoneCountryCode: dialCode,
    }));
  }, [shippingCountry, shippingForm.phoneCountryCode]);

  function handleShippingFieldChange(field: keyof ShippingFormState, value: string) {
    setShippingForm((current) => ({ ...current, [field]: value }));
    setShippingFieldErrors((current) => {
      const next = { ...current };
      if (field === "email" || field === "confirmEmail") {
        delete next.email;
        delete next.confirmEmail;
      } else if (field === "phoneCountryCode" || field === "phoneLocalNumber") {
        delete next.phoneNumber;
      } else {
        delete next[field as ShippingFieldName];
      }
      return next;
    });
    setError(null);
  }

  function handleShippingCountryChange(value: string) {
    setShippingCountry(value);
    setShippingFieldErrors((current) => {
      const next = { ...current };
      delete next.shippingCountry;
      return next;
    });
    setError(null);
  }

  async function handleCheckout() {
    let validatedShipping: CheckoutContactInput | null = null;

    if (!isPickup) {
      const shippingInput = {
        firstName: shippingForm.firstName,
        lastName: shippingForm.lastName,
        email: shippingForm.email,
        confirmEmail: shippingForm.confirmEmail,
        shippingCountry,
        street: shippingForm.street,
        houseNumber: shippingForm.houseNumber,
        postalCode: shippingForm.postalCode,
        city: shippingForm.city,
        phoneNumber: `${shippingForm.phoneCountryCode} ${shippingForm.phoneLocalNumber}`.trim(),
        additionalInfo: shippingForm.additionalInfo,
      };
      const parsedShipping = checkoutContactSchema.safeParse({
        ...shippingInput,
      });

      if (!parsedShipping.success) {
        const flattened = parsedShipping.error.flatten().fieldErrors;
        setShippingFieldErrors({
          firstName: getFriendlyFieldError("firstName", flattened.firstName),
          lastName: getFriendlyFieldError("lastName", flattened.lastName),
          email: getFriendlyFieldError("email", flattened.email),
          confirmEmail: getFriendlyFieldError("confirmEmail", flattened.confirmEmail),
          shippingCountry: getFriendlyFieldError("shippingCountry", flattened.shippingCountry),
          street: getFriendlyFieldError("street", flattened.street),
          houseNumber: getFriendlyFieldError("houseNumber", flattened.houseNumber),
          postalCode: getFriendlyFieldError("postalCode", flattened.postalCode),
          city: getFriendlyFieldError("city", flattened.city),
          phoneNumber: getFriendlyFieldError("phoneNumber", flattened.phoneNumber),
          additionalInfo: getFriendlyFieldError("additionalInfo", flattened.additionalInfo),
        });
        setError(dictionary.cart.fillFormBeforePayment);
        return;
      }

      validatedShipping = parsedShipping.data;
      setShippingFieldErrors({});
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
              ...validatedShipping,
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
        router.push(
          `/order-confirmation?order_number=${encodeURIComponent(json.orderNumber)}&payment=pickup`
        );
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
        <h2 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.cart.cartEmpty}
        </h2>
        <p className="mt-2 text-muted">{dictionary.cart.cartEmptyBody}</p>
        <Link href="/catalog" className="btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> {dictionary.cart.browseCatalog}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 rounded-[1.2rem] border border-border bg-white px-4 py-4 shadow-card sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div className="space-y-2 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
            {dictionary.cart.cart}
          </p>
          <h1 className="font-sans text-[1.95rem] font-bold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-[2.25rem]">
            {dictionary.cart.yourCart} ({totalItems} item{totalItems !== 1 ? "s" : ""})
          </h1>
        </div>

        <div className="inline-flex w-full flex-col gap-1 rounded-[1rem] border border-border/90 bg-background px-4 py-3 sm:w-auto">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {dictionary.cart.totalDueToday}
          </span>
          <span className="font-sans text-xl font-bold tracking-[-0.04em] text-foreground">
            {formatEuroFromCents(total)}
          </span>
        </div>
      </div>

      {cartNotice && (
        <div className="rounded-[1.2rem] border border-border bg-white px-4 py-3 text-sm text-foreground">
          {cartNotice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="order-2 mx-auto w-full max-w-3xl space-y-5 xl:order-1 xl:mx-0 xl:max-w-none">
          <div className="card space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                {dictionary.cart.checkout}
              </p>
              <h2 className="mt-2 font-sans text-[1.9rem] font-bold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-[2.1rem]">
                {dictionary.cart.finishYourOrder}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {dictionary.cart.checkoutIntro}
              </p>
            </div>

            <div className="grid gap-3">
              {checkoutOptions.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => {
                    setCheckoutMode(option.mode);
                    setError(null);
                  }}
                  className={`rounded-[1.35rem] border p-4 text-left transition ${
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
              <span className="font-mono text-foreground">
                {" "}
                NEXT_PUBLIC_PAYPAL_ENABLED=true
              </span>
              .
            </p>
          )}

          {isPickup ? (
            <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-20rem)]">
              <div>
                <label htmlFor="pickup-name" className="label">
                  Name
                </label>
                <input
                  id="pickup-name"
                  className="input"
                  value={pickupName}
                  onChange={(event) => setPickupName(event.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label htmlFor="pickup-email" className="label">
                  Email
                </label>
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
                <label htmlFor="pickup-note" className="label">
                  Pickup note
                </label>
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
            <div className="space-y-4 rounded-[1.35rem] border border-border bg-background p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{dictionary.cart.shippingDetails}</p>
                <p className="mt-1 text-xs leading-6 text-muted">
                  {dictionary.cart.shippingDetailsBody}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="shipping-first-name" className="label">
                    First name
                  </label>
                  <input
                    id="shipping-first-name"
                    className={fieldClassName(shippingFieldErrors.firstName)}
                    value={shippingForm.firstName}
                    onChange={(event) =>
                      handleShippingFieldChange("firstName", event.target.value)
                    }
                    placeholder="Federico"
                  />
                  {shippingFieldErrors.firstName && (
                    <p className="mt-1 text-xs text-danger">{shippingFieldErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="shipping-last-name" className="label">
                    Last name
                  </label>
                  <input
                    id="shipping-last-name"
                    className={fieldClassName(shippingFieldErrors.lastName)}
                    value={shippingForm.lastName}
                    onChange={(event) =>
                      handleShippingFieldChange("lastName", event.target.value)
                    }
                    placeholder="Shopper"
                  />
                  {shippingFieldErrors.lastName && (
                    <p className="mt-1 text-xs text-danger">{shippingFieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="shipping-email" className="label">
                    Email
                  </label>
                  <input
                    id="shipping-email"
                    className={fieldClassName(shippingFieldErrors.email)}
                    value={shippingForm.email}
                    onChange={(event) => handleShippingFieldChange("email", event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                  />
                  {shippingFieldErrors.email && (
                    <p className="mt-1 text-xs text-danger">{shippingFieldErrors.email}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="shipping-confirm-email" className="label">
                    Confirm email
                  </label>
                  <input
                    id="shipping-confirm-email"
                    className={fieldClassName(shippingFieldErrors.confirmEmail)}
                    value={shippingForm.confirmEmail}
                    onChange={(event) =>
                      handleShippingFieldChange("confirmEmail", event.target.value)
                    }
                    placeholder="Repeat your email"
                    type="email"
                  />
                  {shippingFieldErrors.confirmEmail && (
                    <p className="mt-1 text-xs text-danger">
                      {shippingFieldErrors.confirmEmail}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="shipping-country" className="label">
                  Country
                </label>
                <select
                  id="shipping-country"
                  className={fieldClassName(shippingFieldErrors.shippingCountry)}
                  value={shippingCountry}
                  onChange={(event) => handleShippingCountryChange(event.target.value)}
                  disabled={shippingCountries.length === 0}
                >
                  {shippingCountries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.label} ({country.code})
                    </option>
                  ))}
                </select>
                {shippingFieldErrors.shippingCountry && (
                  <p className="mt-1 text-xs text-danger">{shippingFieldErrors.shippingCountry}</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <div>
                  <label htmlFor="shipping-street" className="label">
                    Street
                  </label>
                  <input
                    id="shipping-street"
                    className={fieldClassName(shippingFieldErrors.street)}
                    value={shippingForm.street}
                    onChange={(event) =>
                      handleShippingFieldChange("street", event.target.value)
                    }
                    placeholder="Street name"
                  />
                  {shippingFieldErrors.street && (
                    <p className="mt-1 text-xs text-danger">{shippingFieldErrors.street}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="shipping-house-number" className="label">
                    House number
                  </label>
                  <input
                    id="shipping-house-number"
                    className={fieldClassName(shippingFieldErrors.houseNumber)}
                    value={shippingForm.houseNumber}
                    onChange={(event) =>
                      handleShippingFieldChange("houseNumber", event.target.value)
                    }
                    placeholder="12A"
                  />
                  {shippingFieldErrors.houseNumber && (
                    <p className="mt-1 text-xs text-danger">{shippingFieldErrors.houseNumber}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <div>
                  <label htmlFor="shipping-postal-code" className="label">
                    ZIP code
                  </label>
                  <input
                    id="shipping-postal-code"
                    className={fieldClassName(shippingFieldErrors.postalCode)}
                    value={shippingForm.postalCode}
                    onChange={(event) =>
                      handleShippingFieldChange("postalCode", event.target.value)
                    }
                    placeholder="10115"
                  />
                  {shippingFieldErrors.postalCode && (
                    <p className="mt-1 text-xs text-danger">{shippingFieldErrors.postalCode}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="shipping-city" className="label">
                    City
                  </label>
                  <input
                    id="shipping-city"
                    className={fieldClassName(shippingFieldErrors.city)}
                    value={shippingForm.city}
                    onChange={(event) => handleShippingFieldChange("city", event.target.value)}
                    placeholder="Berlin"
                  />
                  {shippingFieldErrors.city && (
                    <p className="mt-1 text-xs text-danger">{shippingFieldErrors.city}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="shipping-phone" className="label">
                  Phone number
                </label>
                <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                  <select
                    id="shipping-phone-country-code"
                    className={fieldClassName(shippingFieldErrors.phoneNumber)}
                    value={shippingForm.phoneCountryCode}
                    onChange={(event) =>
                      handleShippingFieldChange("phoneCountryCode", event.target.value)
                    }
                  >
                    <option value="">Code</option>
                    {phoneCodeOptions.map((option) => (
                      <option key={option.countryCode} value={option.dialCode}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    id="shipping-phone"
                    className={fieldClassName(shippingFieldErrors.phoneNumber)}
                    value={shippingForm.phoneLocalNumber}
                    onChange={(event) =>
                      handleShippingFieldChange("phoneLocalNumber", event.target.value)
                    }
                    placeholder="Phone number"
                    type="tel"
                  />
                </div>
                {shippingFieldErrors.phoneNumber && (
                  <p className="mt-1 text-xs text-danger">{shippingFieldErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="shipping-additional-info" className="label">
                  Additional information
                </label>
                <textarea
                  id="shipping-additional-info"
                  className={fieldClassName(shippingFieldErrors.additionalInfo) + " min-h-24"}
                  value={shippingForm.additionalInfo}
                  onChange={(event) =>
                    handleShippingFieldChange("additionalInfo", event.target.value)
                  }
                  placeholder="Apartment, company, delivery note, or other useful details"
                />
                {shippingFieldErrors.additionalInfo && (
                  <p className="mt-1 text-xs text-danger">
                    {shippingFieldErrors.additionalInfo}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-[1.2rem] border border-border bg-background px-4 py-3 text-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{dictionary.cart.checkoutTotal}</p>
            <p className="mt-1 font-semibold text-foreground">{formatEuroFromCents(total)}</p>
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
            {dictionary.cart.continueShopping}
          </Link>
        </div>
        </div>

        <aside className="order-1 xl:order-2">
          <div className="card space-y-4 xl:sticky xl:top-24">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {dictionary.cart.currentCart}
                </p>
                <h2 className="mt-2 font-sans text-[1.45rem] font-bold leading-none tracking-[-0.04em] text-foreground">
                  Items
                </h2>
              </div>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {totalItems} item{totalItems !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="rounded-[1.05rem] border border-border/90 bg-white p-3"
                >
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[0.85rem] bg-[#ebe8e1]">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.productId}`}
                        className="line-clamp-2 font-sans text-[1rem] font-bold leading-tight tracking-[-0.04em] text-foreground hover:text-accent"
                      >
                        {item.title}
                      </Link>
                      {item.format && (
                        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted">
                          {item.format}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-surface-hover"
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-surface-hover"
                            disabled={item.quantity >= item.maxQuantity}
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">
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
                </div>
              ))}
            </div>

            <div className="grid gap-3 rounded-[1.1rem] border border-border bg-background p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Subtotal</p>
                <p className="font-semibold text-foreground">
                  {formatEuroFromCents(totalPriceCents)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
                  {shippingLabel}
                </p>
                <p className="font-semibold text-foreground">
                  {isPickup
                    ? "0.00 EUR"
                    : shippingLoading
                      ? "Calculating..."
                      : formatEuroFromCents(shippingCents)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Total</p>
                <p className="font-sans text-lg font-bold tracking-[-0.04em] text-foreground">
                  {formatEuroFromCents(total)}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
