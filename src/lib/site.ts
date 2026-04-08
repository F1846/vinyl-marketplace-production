function clean(value: string | undefined | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

const fallbackSupportEmail = "orders@federicoshop.de";
const configuredContactEmail =
  clean(process.env.STORE_CONTACT_EMAIL) ??
  clean(process.env.STORE_SUPPORT_EMAIL);

export const siteConfig = {
  name: "Federico Shop",
  shortName: "Federico Shop",
  description:
    "Berlin electronic music record shop for techno, EBM, darkwave, post-punk, vinyl, cassette, and CD. Buy graded used records online from Federico Shop.",
  tagline: "Electronic music record shop",
  supportEmail: configuredContactEmail ?? fallbackSupportEmail,
  emergencyEmail:
    clean(process.env.STORE_EMERGENCY_EMAIL) ?? "sandrodoglio40@gmail.com",
  emergencyEmailNote:
    clean(process.env.STORE_EMERGENCY_EMAIL_NOTE) ??
    "Emergency temporary contact while the domain mailbox setup is being finalized.",
  baseUrl:
    clean(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://www.federicoshop.de",
  pickupLabel:
    clean(process.env.STORE_PICKUP_LABEL) ?? "Berlin Neukolln : 12049",
  pickupNote:
    clean(process.env.STORE_PICKUP_NOTE) ??
    "Pickup is arranged by email after your order is placed.",
  pickupContactName:
    clean(process.env.STORE_PICKUP_CONTACT_NAME) ?? "Federico Doglio",
  pickupStreet:
    clean(process.env.STORE_PICKUP_ADDRESS_LINE1) ??
    clean(process.env.STORE_ADDRESS_LINE1) ??
    "Okerstr 43",
  pickupPostalCode:
    clean(process.env.STORE_PICKUP_POSTAL_CODE) ??
    clean(process.env.STORE_POSTAL_CODE) ??
    "12049",
  pickupCity:
    clean(process.env.STORE_PICKUP_CITY) ??
    clean(process.env.STORE_CITY) ??
    "Neukolln Berlin",
  pickupCountry:
    clean(process.env.STORE_PICKUP_COUNTRY) ??
    clean(process.env.STORE_COUNTRY) ??
    "Germany",
  legal: {
    owner: clean(process.env.STORE_OWNER) ?? "Federico Shop",
    street: clean(process.env.STORE_ADDRESS_LINE1) ?? "Okerstr",
    street2: clean(process.env.STORE_ADDRESS_LINE2),
    postalCode: clean(process.env.STORE_POSTAL_CODE) ?? "12049",
    city: clean(process.env.STORE_CITY) ?? "Neukolln Berlin",
    country: clean(process.env.STORE_COUNTRY) ?? "Germany",
    vatId: clean(process.env.STORE_VAT_ID),
    contactEmail: configuredContactEmail ?? fallbackSupportEmail,
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

export function pickupAddressLines(): string[] {
  return [
    siteConfig.pickupContactName,
    siteConfig.pickupStreet,
    [siteConfig.pickupPostalCode, siteConfig.pickupCity].filter(Boolean).join(" "),
    siteConfig.pickupCountry,
  ].filter((value): value is string => Boolean(value));
}
