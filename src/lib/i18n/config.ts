export const SUPPORTED_LOCALES = ["en", "de", "it"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";
export const LOCALE_COOKIE_NAME = "federico_shop_locale";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  de: "German",
  it: "Italian",
};

const COUNTRY_TO_LOCALE: Partial<Record<string, SupportedLocale>> = {
  AT: "de",
  CH: "de",
  DE: "de",
  IT: "it",
  LI: "de",
  LU: "de",
  SM: "it",
  VA: "it",
};

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

function localeFromAcceptLanguage(headerValue: string | null | undefined): SupportedLocale | null {
  if (!headerValue) {
    return null;
  }

  const normalized = headerValue
    .split(",")
    .map((item) => item.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  for (const locale of normalized) {
    const shortLocale = locale?.slice(0, 2);
    if (shortLocale && isSupportedLocale(shortLocale)) {
      return shortLocale;
    }
  }

  return null;
}

export function detectLocale(input: {
  cookieValue?: string | null;
  countryCode?: string | null;
  acceptLanguage?: string | null;
}): SupportedLocale {
  if (isSupportedLocale(input.cookieValue)) {
    return input.cookieValue;
  }

  const countryLocale = input.countryCode
    ? COUNTRY_TO_LOCALE[input.countryCode.toUpperCase()]
    : null;

  if (countryLocale) {
    return countryLocale;
  }

  return localeFromAcceptLanguage(input.acceptLanguage) ?? DEFAULT_LOCALE;
}
