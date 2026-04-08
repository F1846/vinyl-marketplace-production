"use client";

import { useTransition } from "react";
import { LOCALE_COOKIE_NAME, LOCALE_LABELS, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n/config";

export function LanguageSwitcher({ locale }: { locale: SupportedLocale }) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted">
      <span>Lang</span>
      <select
        className="rounded-full border border-border bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground"
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
    </label>
  );
}
