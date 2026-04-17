import { ActivityRead, ActivitySummaryRead } from "@/lib/activities";

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

export function listPublicTripActivities(tripId: number) {
  return request<ActivitySummaryRead[] | null>(`/api/v1/public/trips/${tripId}/activities`).then(
    (activities) => activities ?? [],
  );
}

export function getPublicActivity(activityId: number) {
  return request<ActivityRead | null>(`/api/v1/public/activities/${activityId}`);
}
