"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearIdToken } from "@/lib/auth";

const links = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/trips", label: "Trips" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 border-b border-stone-300 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
          HikeLog Admin
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

      <button
        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        onClick={() => {
          clearIdToken();
          router.push("/login");
        }}
        type="button"
      >
        Logout
      </button>
    </div>
  );
}
