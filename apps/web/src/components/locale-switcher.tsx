"use client";

import { useEffect, useMemo } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Locale, LOCALE_STORAGE_KEY, normalizeEnabledLocales } from "@/lib/i18n";

const localeOptions: Locale[] = ["en", "cs"];

export function LocaleSwitcher({ enabledLocales }: { enabledLocales?: Locale[] }) {
  const { dict, locale, setLocale } = useI18n();
  const enabledLocaleKey = enabledLocales?.join("|") ?? "";
  const allowedLocales = useMemo(
    () => normalizeEnabledLocales(enabledLocaleKey ? enabledLocaleKey.split("|") : undefined),
    [enabledLocaleKey],
  );
  const allowedLocaleKey = allowedLocales.join("|");

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!storedLocale || !allowedLocales.includes(locale)) {
      setLocale(allowedLocales[0]);
    }
  }, [allowedLocaleKey, allowedLocales, locale, setLocale]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
        {dict.nav.language}
      </span>
      <div className="flex rounded-full border border-stone-300 bg-white p-1">
        {localeOptions.filter((option) => allowedLocales.includes(option)).map((option) => {
          const active = locale === option;
          return (
            <button
              key={option}
              className={`rounded-full px-3 py-1 text-sm transition ${
                active ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"
              }`}
              onClick={() => {
                setLocale(option);
              }}
              type="button"
            >
              {option === "en" ? dict.common.english : dict.common.czech}
            </button>
          );
        })}
      </div>
    </div>
  );
}
