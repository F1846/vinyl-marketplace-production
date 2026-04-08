function clean(value: string | undefined | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function emailFromAddress(): string | null {
  const raw = clean(process.env.EMAIL_FROM);
  if (!raw) {
    return null;
  }

  const match = raw.match(/<([^>]+)>/);
  return clean(match?.[1] ?? raw);
}

export const siteConfig = {
  name: "Federico Shop",
  shortName: "Federico Shop",
  description:
    "Electronic music record shop with graded vinyl, cassette, and CD picks, fair euro pricing, and collector-friendly shipping.",
  tagline: "Electronic music record shop",
  supportEmail: emailFromAddress() ?? "hello@federicoshop.de",
  baseUrl:
    clean(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://www.federicoshop.de",
  pickupLabel: clean(process.env.STORE_PICKUP_LABEL) ?? "Berlin local pickup",
  pickupNote:
    clean(process.env.STORE_PICKUP_NOTE) ??
    "Pickup is arranged by email after your order is placed.",
  legal: {
    owner: clean(process.env.STORE_OWNER) ?? "Federico Shop",
    street: clean(process.env.STORE_ADDRESS_LINE1) ?? "Street and house number",
    street2: clean(process.env.STORE_ADDRESS_LINE2),
    postalCode: clean(process.env.STORE_POSTAL_CODE) ?? "Postal code",
    city: clean(process.env.STORE_CITY) ?? "City",
    country: clean(process.env.STORE_COUNTRY) ?? "Germany",
    vatId: clean(process.env.STORE_VAT_ID),
    contactEmail: emailFromAddress() ?? "hello@federicoshop.de",
    phone: clean(process.env.STORE_PHONE),
  },
};

export function siteUrl(path = ""): string {
  return new URL(path, siteConfig.baseUrl).toString();
}

export function legalAddressLines(): string[] {
  return [
    siteConfig.legal.owner,
    siteConfig.legal.street,
    siteConfig.legal.street2,
    [siteConfig.legal.postalCode, siteConfig.legal.city].filter(Boolean).join(" "),
    siteConfig.legal.country,
  ].filter((value): value is string => Boolean(value));
}
