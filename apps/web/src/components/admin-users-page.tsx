"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import { AdminFooter } from "@/components/admin-footer";
import { useI18n } from "@/components/i18n-provider";
import { AdminNav } from "@/components/admin-nav";
import { createAdminUser, deleteAdminUser, listAdminUsers, AdminUserRead } from "@/lib/admin-users";
import { getDateLocale } from "@/lib/i18n";

export function AdminUsersPage() {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const [admins, setAdmins] = useState<AdminUserRead[] | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"creating" | `deleting-${number}` | null>(null);

  const requireToken = () => {
    const token = getIdToken();
    if (!token) {
      router.push("/login");
      return null;
    }
    return token;
  };

  const handleAuthError = (e: unknown) => {
    if (e instanceof Error && e.message === "AUTH_REQUIRED") {
      clearIdToken();
      router.push("/login");
      return true;
    }
    return false;
  };

  const loadAdmins = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    try {
      const data = await listAdminUsers(token);
      setAdmins(data);
    } catch (e: unknown) {
      if (handleAuthError(e)) {
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    }
  };

  useEffect(() => {
    void loadAdmins();
  }, [dict.common.unknownError, router]);

  const addAdmin = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    if (!newEmail.trim()) {
      setError(dict.adminUsers.emailRequired);
      return;
    }

    setBusy("creating");
    setError(null);
    try {
      const created = await createAdminUser(token, newEmail.trim());
      startTransition(() => {
        setAdmins((current) => {
          const items = current ?? [];
          return [...items, created].sort((left, right) => left.email.localeCompare(right.email));
        });
        setNewEmail("");
      });
    } catch (e: unknown) {
      if (handleAuthError(e)) {
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    } finally {
      setBusy(null);
    }
  };

  const removeAdmin = async (admin: AdminUserRead) => {
    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy(`deleting-${admin.id}`);
    setError(null);
    try {
      await deleteAdminUser(token, admin.id);
      startTransition(() => {
        setAdmins((current) => (current ?? []).filter((item) => item.id !== admin.id));
      });
    } catch (e: unknown) {
      if (handleAuthError(e)) {
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f1e8_0%,#f8fafc_30%,#ffffff_100%)] p-6 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <AdminNav />

        <div className="mt-8 rounded-[32px] border border-stone-300/80 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">{dict.adminUsers.title}</h1>
          <p className="mt-2 text-sm text-stone-600">{dict.adminUsers.subtitle}</p>

          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {!admins && !error && <p className="mt-4 text-sm text-stone-600">{dict.common.loading}</p>}

          <section className="mt-6 rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">{dict.adminUsers.email}</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600"
                  onChange={(event) => {
                    setNewEmail(event.target.value);
                  }}
                  placeholder={dict.adminUsers.emailPlaceholder}
                  type="email"
                  value={newEmail}
                />
              </label>

              <div className="flex items-end">
                <button
                  className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={addAdmin}
                  type="button"
                >
                  {busy === "creating" ? dict.adminUsers.adding : dict.adminUsers.add}
                </button>
              </div>
            </div>
          </section>

          {admins && (
            <ul className="mt-6 divide-y rounded-2xl border border-stone-200">
              {admins.map((admin) => (
                <li key={admin.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{admin.email}</div>
                  <div className="mt-1 text-xs text-stone-600">
                    {dict.adminUsers.sub}: {admin.google_sub ?? "—"} · {dict.adminUsers.created}:{" "}
                    {new Date(admin.created_at).toLocaleString(getDateLocale(locale))} · {dict.adminUsers.lastLogin}:{" "}
                    {admin.last_login_at ? new Date(admin.last_login_at).toLocaleString(getDateLocale(locale)) : "—"}
                  </div>
                  </div>

                  <button
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={busy !== null}
                    onClick={() => {
                      void removeAdmin(admin);
                    }}
                    type="button"
                  >
                    {busy === `deleting-${admin.id}` ? dict.adminUsers.removing : dict.adminUsers.remove}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <AdminFooter />
      </div>
    </main>
  );
}
