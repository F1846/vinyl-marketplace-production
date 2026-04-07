import type { ProductFormat } from "@/types/product";

export type ShippingRateFormat = ProductFormat | "all";

export interface ShippingCountryOption {
  code: string;
  label: string;
}

export interface ShippingQuoteLine {
  format: ProductFormat;
  quantity: number;
  rateCents: number;
  matchedCountryCode: string;
  matchedFormatScope: ShippingRateFormat;
}

export interface ShippingQuote {
  countryCode: string;
  countryLabel: string;
  totalCents: number;
  lines: ShippingQuoteLine[];
}
