import type { ProductFormat } from "@/types/product";

function clean(value: string | undefined | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export type CatalogLinkQuery = {
  q?: string;
  format?: ProductFormat;
  genre?: string;
};

export const catalogFormatCollections: Array<{ label: string; format: ProductFormat }> = [
  { label: "Vinyl records", format: "vinyl" },
  { label: "Cassette tapes", format: "cassette" },
  { label: "CDs", format: "cd" },
];

export const catalogGenreCollections: Array<{ label: string; genre: string }> = [
  { label: "Techno", genre: "Techno" },
  { label: "Electro", genre: "Electro" },
  { label: "Darkwave", genre: "Darkwave" },
  { label: "EBM", genre: "EBM" },
  { label: "Ambient", genre: "Ambient" },
  { label: "Post-Punk", genre: "Post-Punk" },
];

export function buildCatalogPath(query: CatalogLinkQuery = {}): string {
  const params = new URLSearchParams();

  if (query.q?.trim()) {
    params.set("q", query.q.trim());
  }

  if (query.format) {
    params.set("format", query.format);
  }

  if (query.genre?.trim()) {
    params.set("genre", query.genre.trim());
  }

  const search = params.toString();
  return search ? `/catalog?${search}` : "/catalog";
}

const fallbackOrderEmail = "orders@federicoshop.de";
const fallbackSupportEmail = "support@federicoshop.de";
const configuredOrderEmail =
  clean(process.env.STORE_ORDER_EMAIL) ??
  clean(process.env.STORE_CONTACT_EMAIL);
const configuredSupportEmail =
  clean(process.env.STORE_SUPPORT_EMAIL) ??
  clean(process.env.STORE_SUPPORT_CONTACT_EMAIL);

export const siteConfig = {
  name: "Federico Shop",
  shortName: "Federico Shop",
  description:
    "Federico Shop is a Berlin electronic music record shop for techno, electro, EBM, darkwave, ambient, and post-punk vinyl, cassette, and CD collector copies.",
  tagline: "Electronic music record shop",
  seoKeywords: [
    "Federico Shop",
    "Federico Shop Berlin",
    "Federico Berlin vinyl",
    "Berlin record shop",
    "Berlin vinyl store",
    "electronic music record shop",
    "techno vinyl",
    "electro vinyl",
    "EBM records",
    "darkwave vinyl",
    "ambient records",
    "post-punk records",
    "used vinyl online",
    "vinyl records",
    "cassette tapes",
    "CD shop",
  ],
  orderEmail: configuredOrderEmail ?? fallbackOrderEmail,
  supportEmail: configuredSupportEmail ?? fallbackSupportEmail,
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
    clean(process.env.STORE_PICKUP_ADDRESS_LINE1) ?? "Okerstr 43",
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
  pickupPhone:
    clean(process.env.STORE_PICKUP_PHONE) ?? "+393318095687",
  pickupPhoneLabel:
    clean(process.env.STORE_PICKUP_PHONE_LABEL) ?? "WhatsApp only",
  legal: {
    owner: clean(process.env.STORE_OWNER) ?? "Federico Shop",
    street: clean(process.env.STORE_ADDRESS_LINE1) ?? "Okerstr",
    street2: clean(process.env.STORE_ADDRESS_LINE2),
    postalCode: clean(process.env.STORE_POSTAL_CODE) ?? "12049",
    city: clean(process.env.STORE_CITY) ?? "Neukolln Berlin",
    country: clean(process.env.STORE_COUNTRY) ?? "Germany",
    vatId: clean(process.env.STORE_VAT_ID),
    contactEmail: configuredSupportEmail ?? fallbackSupportEmail,
    phone: clean(process.env.STORE_PHONE),
  },
};

export function siteUrl(path = ""): string {
  return new URL(path, siteConfig.baseUrl).toString();
}

export function buildCatalogUrl(query: CatalogLinkQuery = {}): string {
  return siteUrl(buildCatalogPath(query));
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

export function pickupAddressCoreLines(): string[] {
  return [
    siteConfig.pickupContactName,
    siteConfig.pickupStreet,
    [siteConfig.pickupPostalCode, siteConfig.pickupCity].filter(Boolean).join(" "),
    siteConfig.pickupCountry,
  ].filter((value): value is string => Boolean(value));
}

export function pickupContactLine(): string | null {
  if (!siteConfig.pickupPhone) {
    return null;
  }

  const methodLabel = siteConfig.pickupPhoneLabel
    ? ` via ${siteConfig.pickupPhoneLabel}`
    : "";

  return `Contact ${siteConfig.pickupPhone}${methodLabel} for order pickup.`;
}

export function pickupAddressLines(): string[] {
  return [
    ...pickupAddressCoreLines(),
    siteConfig.pickupPhone
      ? `${siteConfig.pickupPhone}${siteConfig.pickupPhoneLabel ? ` (${siteConfig.pickupPhoneLabel})` : ""}`
      : null,
  ].filter((value): value is string => Boolean(value));
}
