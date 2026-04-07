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
const FORMAT_FALLBACK_SCOPE = "all";
const countryNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

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

export function getCountryLabel(countryCode: string): string {
  const normalized = normalizeCountryCode(countryCode);
  if (normalized === COUNTRY_FALLBACK_CODE) {
    return "All countries";
  }

  return countryNames?.of(normalized) ?? normalized;
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
  const matches = rates
    .filter((rate) => {
      if (rate.countryCode !== countryCode && rate.countryCode !== COUNTRY_FALLBACK_CODE) {
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
        Number(right.countryCode === countryCode) - Number(left.countryCode === countryCode);
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

  const exactCountries = [...new Set(
    rows
      .map((row) => normalizeCountryCode(row.countryCode))
      .filter((countryCode) => isIsoCountryCode(countryCode))
  )];

  exactCountries.sort((left, right) => getCountryLabel(left).localeCompare(getCountryLabel(right)));

  if (exactCountries.includes("DE")) {
    exactCountries.splice(exactCountries.indexOf("DE"), 1);
    exactCountries.unshift("DE");
  }

  return exactCountries.map((code) => ({
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
  const d = db();
  const rates = await d
    .select()
    .from(schema.shippingRates)
    .where(
      and(
        or(
          eq(schema.shippingRates.countryCode, normalizedCountryCode),
          eq(schema.shippingRates.countryCode, COUNTRY_FALLBACK_CODE)
        ),
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
