import { GlobalContentRead } from "@/lib/global-content";

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing API_BASE_URL");
  }
  return baseUrl;
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    return null as T;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export function getPublicGlobalContent() {
  return request<GlobalContentRead | null>("/api/v1/public/global-content");
}
