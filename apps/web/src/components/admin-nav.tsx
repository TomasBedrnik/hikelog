"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

export function AdminNav() {
  const pathname = usePathname();
  const { dict } = useI18n();
  const links = [
    { href: "/admin/trips", label: dict.nav.trips },
    { href: "/admin/activities", label: dict.nav.activities },
    { href: "/admin/strava", label: dict.nav.strava },
    { href: "/admin/gallery", label: dict.nav.gallery },
    { href: "/admin/site", label: dict.nav.site },
  ];

  return (
    <div className="border-b border-stone-300 pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
        {dict.nav.brand}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => {
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
