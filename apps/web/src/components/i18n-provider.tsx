"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  dictionaries,
  Dictionary,
  LOCALE_STORAGE_KEY,
  Locale,
  normalizeLocale,
} from "@/lib/i18n";

type I18nContextValue = {
  dict: Dictionary;
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return normalizeLocale(stored ?? window.navigator.language);
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const nextLocale = normalizeLocale(stored ?? window.navigator.language);
    setLocale(nextLocale);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider
      value={{
        dict: dictionaries[locale],
        locale,
        setLocale,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
