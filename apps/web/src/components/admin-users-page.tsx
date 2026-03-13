"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import { useI18n } from "@/components/i18n-provider";
import { AdminNav } from "@/components/admin-nav";
import { getDateLocale } from "@/lib/i18n";

type AdminUserRead = {
  id: number;
  email: string;
  google_sub: string | null;
  created_at: string;
  last_login_at: string | null;
};

export function AdminUsersPage() {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const [admins, setAdmins] = useState<AdminUserRead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getIdToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

    fetch(`${baseUrl}/api/v1/admin-users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          clearIdToken();
          router.push("/login");
          return;
        }
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        const data = (await res.json()) as AdminUserRead[];
        setAdmins(data);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : dict.common.unknownError);
      });
  }, [dict.common.unknownError, router]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f1e8_0%,#f8fafc_30%,#ffffff_100%)] p-6 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <AdminNav />

        <div className="mt-8 rounded-[32px] border border-stone-300/80 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">{dict.adminUsers.title}</h1>
          <p className="mt-2 text-sm text-stone-600">{dict.adminUsers.subtitle}</p>

          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {!admins && !error && <p className="mt-4 text-sm text-stone-600">{dict.common.loading}</p>}

          {admins && (
            <ul className="mt-6 divide-y rounded-2xl border border-stone-200">
              {admins.map((admin) => (
                <li key={admin.id} className="p-4">
                  <div className="font-medium">{admin.email}</div>
                  <div className="mt-1 text-xs text-stone-600">
                    {dict.adminUsers.sub}: {admin.google_sub ?? "—"} · {dict.adminUsers.created}:{" "}
                    {new Date(admin.created_at).toLocaleString(getDateLocale(locale))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
