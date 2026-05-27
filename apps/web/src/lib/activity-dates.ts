import { getDateLocale } from "@/lib/i18n";

export type LocaleCode = "en" | "cs";

function getTimezoneOffsetMinutes(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const utcLikeTime = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return (utcLikeTime - date.getTime()) / 60000;
}

function formatOffset(minutes: number) {
  const sign = minutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60)
    .toString()
    .padStart(2, "0");
  const remainderMinutes = Math.floor(absoluteMinutes % 60)
    .toString()
    .padStart(2, "0");
  return `${sign}${hours}:${remainderMinutes}`;
}

export function formatActivityDateTime(
  value: string | null,
  locale: LocaleCode,
  timezone?: string | null,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!value) {
    return null;
  }

  const formatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone ?? undefined,
    ...options,
  } satisfies Intl.DateTimeFormatOptions;

  try {
    return new Intl.DateTimeFormat(getDateLocale(locale), formatOptions).format(new Date(value));
  } catch (error) {
    if (!(error instanceof RangeError) || !timezone) {
      throw error;
    }
    return new Intl.DateTimeFormat(getDateLocale(locale), {
      ...formatOptions,
      timeZone: undefined,
    }).format(new Date(value));
  }
}

export function formatActivityDate(
  value: string | null,
  locale: LocaleCode,
  timezone?: string | null,
) {
  return formatActivityDateTime(value, locale, timezone, {
    dateStyle: "medium",
    timeStyle: undefined,
  });
}

export function activityDateTimeInputValue(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

export function activityDateTimeInputToIso(value: string, timezone: string | null) {
  if (!value) {
    return null;
  }

  if (!timezone) {
    return new Date(value).toISOString();
  }

  const utcGuess = new Date(`${value}:00.000Z`);
  try {
    const offsetMinutes = getTimezoneOffsetMinutes(timezone, utcGuess);
    return `${value}:00${formatOffset(offsetMinutes)}`;
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    return new Date(value).toISOString();
  }
}
