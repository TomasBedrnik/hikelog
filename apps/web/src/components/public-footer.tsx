"use client";

import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useI18n } from "@/components/i18n-provider";
import { Locale, normalizeEnabledLocales } from "@/lib/i18n";

export function PublicFooter({ enabledLocales }: { enabledLocales?: Locale[] }) {
  const { dict } = useI18n();
  const allowedLocales = normalizeEnabledLocales(enabledLocales);

  return (
    <footer className="mt-20 border-t border-stone-400 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link className="text-sm text-stone-500 transition hover:text-stone-900" href="/admin">
            {dict.publicSite.adminLink}
          </Link>
        </div>
        {allowedLocales.length > 1 ? <LocaleSwitcher enabledLocales={allowedLocales} /> : null}
      </div>
    </footer>
  );
}
