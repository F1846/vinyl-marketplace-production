"use client";

import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { LOCALE_COOKIE_NAME, LOCALE_LABELS, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n/config";

export function LanguageSwitcher({ locale }: { locale: SupportedLocale }) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="relative inline-flex items-center">
      <select
        className="min-w-[8.25rem] appearance-none rounded-full border border-border bg-white px-4 py-2 pr-10 text-sm font-medium text-foreground shadow-sm transition focus:border-foreground/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        value={locale}
        disabled={isPending}
        onChange={(event) => {
          const nextLocale = event.target.value as SupportedLocale;
          startTransition(() => {
            document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
            window.location.reload();
          });
        }}
      >
        {SUPPORTED_LOCALES.map((item) => (
          <option key={item} value={item}>
            {LOCALE_LABELS[item]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted" />
    </label>
  );
}
