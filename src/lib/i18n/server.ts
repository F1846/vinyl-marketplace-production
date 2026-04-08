import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, detectLocale, LOCALE_COOKIE_NAME } from "./config";
import { getDictionary } from "./dictionaries";

function isCrawler(userAgent: string | null | undefined) {
  if (!userAgent) {
    return false;
  }

  return /bot|crawl|crawler|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|whatsapp|telegrambot|duckduckbot|googleother|adsbot/i.test(
    userAgent,
  );
}

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieValue = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (!cookieValue && isCrawler(headerStore.get("user-agent"))) {
    return DEFAULT_LOCALE;
  }

  return detectLocale({
    cookieValue,
    countryCode: headerStore.get("x-vercel-ip-country"),
    acceptLanguage: headerStore.get("accept-language"),
  });
}

export async function getRequestDictionary() {
  const locale = await getRequestLocale();
  return getDictionary(locale);
}
