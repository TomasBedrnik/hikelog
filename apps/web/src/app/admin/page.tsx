"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";

type AdminUserRead = {
  id: number;
  email: string;
  google_sub: string | null;
  created_at: string;
  last_login_at: string | null;
};

export default function AdminPage() {
  const router = useRouter();
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
        setError(e instanceof Error ? e.message : "Unknown error");
      });
  }, [router]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admins</h1>
        <button
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => {
            clearIdToken();
            router.push("/login");
          }}
        >
          Logout
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!admins && !error && <p className="mt-4 text-sm text-gray-600">Loading…</p>}

      {admins && (
        <ul className="mt-6 divide-y rounded-md border">
          {admins.map((a) => (
            <li key={a.id} className="p-4">
              <div className="font-medium">{a.email}</div>
              <div className="mt-1 text-xs text-gray-600">
                sub: {a.google_sub ?? "—"} · created: {new Date(a.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
