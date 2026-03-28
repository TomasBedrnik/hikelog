"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearIdToken } from "@/lib/auth";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useI18n } from "@/components/i18n-provider";

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useI18n();
  const links = [
    { href: "/admin/users", label: dict.nav.users },
    { href: "/admin/trips", label: dict.nav.trips },
    { href: "/admin/gallery", label: dict.nav.gallery },
  ];

  return (
    <div className="flex flex-col gap-4 border-b border-stone-300 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
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

      <div className="flex flex-wrap items-center gap-3">
        <LocaleSwitcher />
        <button
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          onClick={() => {
            clearIdToken();
            router.push("/login");
          }}
          type="button"
        >
          {dict.nav.logout}
        </button>
      </div>
    </div>
  );
}
