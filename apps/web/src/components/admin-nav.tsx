"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { isBootstrapOnly } from "@/lib/auth";

export function AdminNav() {
  const pathname = usePathname();
  const { dict } = useI18n();
  const [bootstrapOnly, setBootstrapOnly] = useState<boolean | null>(null);

  useEffect(() => {
    setBootstrapOnly(isBootstrapOnly());
  }, [pathname]);

  const links = bootstrapOnly
    ? [{ href: "/admin/users", label: dict.nav.users }]
    : [
        { href: "/admin/trips", label: dict.nav.trips },
        { href: "/admin/activities", label: dict.nav.activities },
        { href: "/admin/strava", label: dict.nav.strava },
        { href: "/admin/webpushr", label: dict.nav.webpushr },
        { href: "/admin/gallery", label: dict.nav.gallery },
        { href: "/admin/site", label: dict.nav.site },
      ];

  return (
    <div className="border-b border-stone-300 pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
        {dict.nav.brand}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {bootstrapOnly === null
          ? null
          : links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-stone-900 text-white"
                      : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                  href={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
      </div>
    </div>
  );
}
