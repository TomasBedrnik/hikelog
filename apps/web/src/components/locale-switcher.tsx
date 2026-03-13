"use client";

import { useI18n } from "@/components/i18n-provider";
import { Locale } from "@/lib/i18n";

const localeOptions: Locale[] = ["en", "cs"];

export function LocaleSwitcher() {
  const { dict, locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
        {dict.nav.language}
      </span>
      <div className="flex rounded-full border border-stone-300 bg-white p-1">
        {localeOptions.map((option) => {
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
