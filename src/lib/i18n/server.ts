import { cookies, headers } from "next/headers";
import { detectLocale, LOCALE_COOKIE_NAME } from "./config";
import { getDictionary } from "./dictionaries";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return detectLocale({
    cookieValue: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    countryCode: headerStore.get("x-vercel-ip-country"),
    acceptLanguage: headerStore.get("accept-language"),
  });
}

export async function getRequestDictionary() {
  const locale = await getRequestLocale();
  return getDictionary(locale);
}
