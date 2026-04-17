export type AdminUserRead = {
  id: number;
  email: string;
  google_sub: string | null;
  created_at: string;
  last_login_at: string | null;
};

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }
  return baseUrl;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("AUTH_REQUIRED");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export function listAdminUsers(token: string) {
  return request<AdminUserRead[]>("/api/v1/admin-users", token);
}

export function createAdminUser(token: string, email: string) {
  return request<AdminUserRead>("/api/v1/admin-users", token, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function deleteAdminUser(token: string, adminUserId: number) {
  return request<void>(`/api/v1/admin-users/${adminUserId}`, token, {
    method: "DELETE",
  });
}
