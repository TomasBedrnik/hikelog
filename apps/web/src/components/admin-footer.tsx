"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearIdToken } from "@/lib/auth";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useI18n } from "@/components/i18n-provider";

export function AdminFooter() {
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useI18n();
  const usersActive = pathname === "/admin/users";

  return (
    <footer className="mt-8 border-t border-stone-300 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              usersActive
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
            }`}
            href="/admin/users"
          >
            {dict.nav.users}
          </Link>
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
    </footer>
  );
}
