"use client";

import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useI18n } from "@/components/i18n-provider";

export function PublicFooter() {
  const { dict } = useI18n();

  return (
    <footer className="mt-20 border-t border-stone-200 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-stone-900">HikeLog</p>
          <Link className="text-sm text-stone-500 transition hover:text-stone-900" href="/admin">
            {dict.publicSite.adminLink}
          </Link>
        </div>
        <LocaleSwitcher />
      </div>
    </footer>
  );
}
