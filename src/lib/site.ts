import type { ProductFormat } from "@/types/product";

function clean(value: string | undefined | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizePickupLabel(value: string | null): string {
  const fallback = "Berlin Neukolln 12049";

  if (!value) {
    return fallback;
  }

  const normalizedValue = value.replace(/Berlin Neukolln\s*:\s*12049/i, fallback);

  return /studio/i.test(normalizedValue) ? fallback : normalizedValue;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = value.trim();

    if (!normalized) {
      return false;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export type CatalogLinkQuery = {
  q?: string;
  format?: ProductFormat;
  genre?: string | string[];
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

  const genres = Array.isArray(query.genre) ? query.genre : query.genre ? [query.genre] : [];
  for (const genre of genres.map((value) => value.trim()).filter(Boolean)) {
    params.append("genre", genre);
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

const brandAliases = uniqueStrings([
  "Federico Shop",
  "Federico Shop Berlin",
  "Federico Shop DE",
  "Federico Shop Germany",
  "Federico Shop Deutschland",
  "Federico Shop Italia",
  "Federico Shop Records, Tapes and CDs",
  "Federico Shop Vinyl",
  "Federico Shop Neukolln",
]);

const seoKeywords = uniqueStrings([
  ...brandAliases,
  "Federico Berlin vinyl",
  "Berlin record shop",
  "Berlin vinyl store",
  "Berlin vinyl records",
  "Berlin record store",
  "Berlin vinyl shop",
  "Berlin CD shop",
  "Berlin cassette shop",
  "Berlin-based online record shop",
  "electronic music online record shop",
  "Berlin online record shop",
  "electronic vinyl Berlin",
  "used electronic music records",
  "collector vinyl Berlin",
  "collector records Berlin",
  "used vinyl Berlin",
  "used vinyl online",
  "used CDs Berlin",
  "used cassettes Berlin",
  "vinyl records",
  "cassette tapes",
  "CD shop",
  "techno vinyl",
  "techno vinyl Berlin",
  "techno records Berlin",
  "electro vinyl",
  "electro records Berlin",
  "EBM records",
  "EBM records Berlin",
  "darkwave vinyl",
  "darkwave records Berlin",
  "ambient records",
  "ambient vinyl Berlin",
  "post-punk records",
  "post-punk vinyl Berlin",
  "Berlin local pickup records",
  "Berlin Neukolln record shop",
  "record shop Neukolln Berlin",
  "electronic music store Berlin",
  "techno record store Berlin",
  "Schallplattenladen Berlin",
  "Schallplatten Berlin",
  "Schallplatten Neukolln",
  "Elektronische Musik Schallplatten Berlin",
  "Techno Schallplatten Berlin",
  "Techno Plattenladen Berlin",
  "Electro Schallplatten",
  "EBM Schallplatten",
  "Darkwave Schallplatten",
  "Post-Punk Schallplatten",
  "Plattenladen Berlin Neukolln",
  "Berliner Plattenladen",
  "Vinyl Berlin kaufen",
  "gebrauchte Schallplatten Berlin",
  "gebrauchte Vinyl Berlin",
  "Kassettenladen Berlin",
  "CD Laden Berlin",
  "lokale Abholung Berlin",
  "lokale Abholung Neukolln",
  "Vinili Berlino",
  "negozio dischi Berlino",
  "negozio vinili Berlino",
  "negozio musica elettronica Berlino",
  "vinili techno Berlino",
  "vinili techno usati",
  "vinili electro Berlino",
  "vinili darkwave",
  "dischi EBM",
  "dischi post-punk",
  "vinili usati Berlino",
  "cassette usate Berlino",
  "CD usati Berlino",
  "ritiro locale Berlino",
  "ritiro locale Neukolln Berlino",
  "Discos de vinilo Berlin",
  "tienda de discos Berlin",
  "tienda de vinilos Berlin",
  "tienda de musica electronica Berlin",
  "vinilos techno Berlin",
  "vinilos techno usados",
  "vinilos darkwave",
  "discos EBM",
  "discos post-punk",
  "vinilos usados Berlin",
  "cassettes usados Berlin",
  "CD usados Berlin",
  "recogida local Berlin",
  "recogida local Neukolln Berlin",
]);

export const siteConfig = {
  name: "Federico Shop",
  shortName: "Federico Shop",
  description:
    "Federico Shop is a Berlin-based online record shop for techno, electro, EBM, darkwave, ambient, and post-punk vinyl, cassette, and CD collector copies.",
  tagline: "Berlin-based online record shop",
  discogsUrl: "https://www.discogs.com/it/user/F1846",
  faviconPath: "/favicon.ico",
  faviconSvgPath: "/favicon.svg",
  logoPath: "/logo-mark.svg",
  brandAliases,
  seoKeywords,
  orderEmail: configuredOrderEmail ?? fallbackOrderEmail,
  supportEmail: configuredSupportEmail ?? fallbackSupportEmail,
  baseUrl:
    clean(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://www.federicoshop.de",
  pickupLabel: normalizePickupLabel(clean(process.env.STORE_PICKUP_LABEL)),
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
  return "You will receive a follow-up email with local pickup details.";
}

export function pickupAddressLines(): string[] {
  return [
    ...pickupAddressCoreLines(),
    siteConfig.pickupPhone
      ? `${siteConfig.pickupPhone}${siteConfig.pickupPhoneLabel ? ` (${siteConfig.pickupPhoneLabel})` : ""}`
      : null,
  ].filter((value): value is string => Boolean(value));
}
