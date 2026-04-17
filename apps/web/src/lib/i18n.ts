import cs from "@/locales/cs.json";
import en from "@/locales/en.json";

export const LOCALE_STORAGE_KEY = "hikelog_locale";

export const locales = ["en", "cs"] as const;

export type Locale = (typeof locales)[number];

export const DEFAULT_ENABLED_LOCALES: Locale[] = ["en", "cs"];

export const dictionaries = {
  en,
  cs,
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) {
    return "en";
  }

  return value.toLowerCase().startsWith("cs") ? "cs" : "en";
}

export function normalizeEnabledLocales(value: string[] | null | undefined): Locale[] {
  const enabled = (value ?? []).filter((locale): locale is Locale =>
    locales.includes(locale as Locale),
  );
  return enabled.length > 0 ? enabled : DEFAULT_ENABLED_LOCALES;
}

export function getDateLocale(locale: Locale) {
  return locale === "cs" ? "cs-CZ" : "en-US";
}

export function formatMessage(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}
