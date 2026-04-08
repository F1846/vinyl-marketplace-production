"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { SupportedLocale } from "@/lib/i18n/config";

type LocaleContextValue = {
  dictionary: Dictionary;
  locale: SupportedLocale;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  dictionary,
  locale,
}: {
  children: ReactNode;
  dictionary: Dictionary;
  locale: SupportedLocale;
}) {
  return (
    <LocaleContext.Provider value={{ dictionary, locale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocaleContext() {
  const value = useContext(LocaleContext);

  if (!value) {
    throw new Error("LocaleProvider is missing");
  }

  return value;
}

export function useDictionary() {
  return useLocaleContext().dictionary;
}
