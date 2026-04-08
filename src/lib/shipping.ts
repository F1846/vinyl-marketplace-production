import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ProductFormat } from "@/types/product";
import type {
  ShippingCountryOption,
  ShippingQuote,
  ShippingQuoteLine,
} from "@/types/shipping";

const COUNTRY_FALLBACK_CODE = "ALL";
const EUROPE_GROUP_CODE = "EUROPE";
const UK_SWITZERLAND_GROUP_CODE = "GB_CH";
const FORMAT_FALLBACK_SCOPE = "all";
const countryNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

const EUROPE_COUNTRY_CODES = [
  "AL",
  "AD",
  "AT",
  "BA",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "SE",
  "SI",
  "SK",
  "SM",
  "UA",
  "VA",
] as const;
const EUROPE_COUNTRY_CODE_SET = new Set<string>(EUROPE_COUNTRY_CODES);
const UK_SWITZERLAND_COUNTRY_CODES = ["GB", "CH"] as const;
const COUNTRY_GROUP_EXPANSIONS: Record<string, readonly string[]> = {
  [EUROPE_GROUP_CODE]: EUROPE_COUNTRY_CODES,
  [UK_SWITZERLAND_GROUP_CODE]: UK_SWITZERLAND_COUNTRY_CODES,
};
const COUNTRY_LABEL_OVERRIDES: Record<string, string> = {
  [COUNTRY_FALLBACK_CODE]: "All countries",
  [EUROPE_GROUP_CODE]: "Europe",
  [UK_SWITZERLAND_GROUP_CODE]: "UK and Switzerland",
  PS: "Palestine",
};

export const SHIPPING_RULE_GROUP_CODES = [
  COUNTRY_FALLBACK_CODE,
  EUROPE_GROUP_CODE,
  UK_SWITZERLAND_GROUP_CODE,
] as const;

type ShippingLineInput = {
  format: ProductFormat;
  quantity: number;
};

type ShippingRateRow = typeof schema.shippingRates.$inferSelect;

export function normalizeCountryCode(countryCode: string): string {
  return countryCode.trim().toUpperCase();
}

export function isIsoCountryCode(countryCode: string): boolean {
  return /^[A-Z]{2}$/.test(normalizeCountryCode(countryCode));
}

export function isShippingRuleCountryCode(countryCode: string): boolean {
  const normalized = normalizeCountryCode(countryCode);
  return isIsoCountryCode(normalized) || SHIPPING_RULE_GROUP_CODES.includes(normalized as (typeof SHIPPING_RULE_GROUP_CODES)[number]);
}

export function getCountryLabel(countryCode: string): string {
  const normalized = normalizeCountryCode(countryCode);
  const overridden = COUNTRY_LABEL_OVERRIDES[normalized];
  if (overridden) {
    return overridden;
  }

  return countryNames?.of(normalized) ?? normalized;
}

function getShippingCountryCandidates(countryCode: string): string[] {
  const normalized = normalizeCountryCode(countryCode);
  const candidates = [normalized];

  if (EUROPE_COUNTRY_CODE_SET.has(normalized)) {
    candidates.push(EUROPE_GROUP_CODE);
  }
  if (normalized === "GB" || normalized === "CH") {
    candidates.push(UK_SWITZERLAND_GROUP_CODE);
  }

  candidates.push(COUNTRY_FALLBACK_CODE);
  return candidates;
}

function groupQuantitiesByFormat(items: ShippingLineInput[]): Map<ProductFormat, number> {
  const quantities = new Map<ProductFormat, number>();

  for (const item of items) {
    if (item.quantity <= 0) continue;
    quantities.set(item.format, (quantities.get(item.format) ?? 0) + item.quantity);
  }

  return quantities;
}

function pickBestShippingRate(
  rates: ShippingRateRow[],
  countryCode: string,
  format: ProductFormat,
  quantity: number
): ShippingRateRow | null {
  const candidateRank = new Map(
    getShippingCountryCandidates(countryCode).map((candidate, index) => [candidate, index])
  );
  const matches = rates
    .filter((rate) => {
      if (!candidateRank.has(rate.countryCode)) {
        return false;
      }
      if (rate.formatScope !== format && rate.formatScope !== FORMAT_FALLBACK_SCOPE) {
        return false;
      }
      if (quantity < rate.minQuantity) {
        return false;
      }
      if (rate.maxQuantity !== null && quantity > rate.maxQuantity) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      const countryPriority =
        (candidateRank.get(left.countryCode) ?? Number.MAX_SAFE_INTEGER) -
        (candidateRank.get(right.countryCode) ?? Number.MAX_SAFE_INTEGER);
      if (countryPriority !== 0) return countryPriority;

      const formatPriority =
        Number(right.formatScope === format) - Number(left.formatScope === format);
      if (formatPriority !== 0) return formatPriority;

      const minQuantityPriority = right.minQuantity - left.minQuantity;
      if (minQuantityPriority !== 0) return minQuantityPriority;

      return (left.maxQuantity ?? Number.MAX_SAFE_INTEGER) - (right.maxQuantity ?? Number.MAX_SAFE_INTEGER);
    });

  return matches[0] ?? null;
}

export async function getShippingCountryOptions(): Promise<ShippingCountryOption[]> {
  const d = db();
  const rows = await d
    .select({ countryCode: schema.shippingRates.countryCode })
    .from(schema.shippingRates);

  const exactCountries = new Set<string>();

  for (const row of rows) {
    const normalized = normalizeCountryCode(row.countryCode);
    if (isIsoCountryCode(normalized)) {
      exactCountries.add(normalized);
      continue;
    }

    for (const countryCode of COUNTRY_GROUP_EXPANSIONS[normalized] ?? []) {
      exactCountries.add(countryCode);
    }
  }

  const sortedCountries = [...exactCountries].sort((left, right) =>
    getCountryLabel(left).localeCompare(getCountryLabel(right))
  );

  if (sortedCountries.includes("DE")) {
    sortedCountries.splice(sortedCountries.indexOf("DE"), 1);
    sortedCountries.unshift("DE");
  }

  return sortedCountries.map((code) => ({
    code,
    label: getCountryLabel(code),
  }));
}

export async function calculateShippingQuote(
  countryCode: string,
  items: ShippingLineInput[]
): Promise<ShippingQuote> {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (!isIsoCountryCode(normalizedCountryCode)) {
    throw new Error("Shipping country must be a 2-letter ISO code");
  }

  const formatQuantities = groupQuantitiesByFormat(items);
  if (formatQuantities.size === 0) {
    return {
      countryCode: normalizedCountryCode,
      countryLabel: getCountryLabel(normalizedCountryCode),
      totalCents: 0,
      lines: [],
    };
  }

  const formats = [...formatQuantities.keys()];
  const countryCandidates = getShippingCountryCandidates(normalizedCountryCode);
  const d = db();
  const rates = await d
    .select()
    .from(schema.shippingRates)
    .where(
      and(
        inArray(schema.shippingRates.countryCode, countryCandidates),
        or(
          eq(schema.shippingRates.formatScope, FORMAT_FALLBACK_SCOPE),
          inArray(schema.shippingRates.formatScope, formats)
        )
      )
    );

  const lines: ShippingQuoteLine[] = [];

  for (const [format, quantity] of formatQuantities.entries()) {
    const rate = pickBestShippingRate(rates, normalizedCountryCode, format, quantity);
    if (!rate) {
      throw new Error(`No shipping rate configured for ${format} x${quantity} to ${normalizedCountryCode}`);
    }

    lines.push({
      format,
      quantity,
      rateCents: rate.rateCents,
      matchedCountryCode: rate.countryCode,
      matchedFormatScope: rate.formatScope,
    });
  }

  return {
    countryCode: normalizedCountryCode,
    countryLabel: getCountryLabel(normalizedCountryCode),
    totalCents: lines.reduce((sum, line) => sum + line.rateCents, 0),
    lines,
  };
}
