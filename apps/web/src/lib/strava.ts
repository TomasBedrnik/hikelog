export type StravaConnectionRead = {
  connected: boolean;
  athlete_id: number | null;
  username: string | null;
  firstname: string | null;
  lastname: string | null;
  profile_medium: string | null;
  scopes: string[];
  expires_at: string | null;
};

export type StravaConnectResponse = {
  authorization_url: string;
};

export type StravaRecentActivityRead = {
  id: number;
  name: string;
  sport_type: string | null;
  start_date: string;
  timezone: string | null;
  distance: number | null;
  moving_time: number | null;
  total_elevation_gain: number | null;
};

export type StravaImportedActivityRead = {
  id: number;
  trip_id: number;
  trip_name: string | null;
  strava_activity_id: number | null;
  user_id: number | null;
  upload_id: number | null;
  external_id: string | null;
  type: string | null;
  sport_type: string | null;
  start_date: string | null;
  timezone: string | null;
  name: string;
  distance: number | null;
  moving_time: number | null;
  elapsed_time: number | null;
  total_elevation_gain: number | null;
  description: Record<string, unknown> | null;
  polyline: string | null;
  summary_polyline: string | null;
  comments: unknown[];
  photos: unknown[];
  created_at: string;
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

export function getStravaConnection(token: string) {
  return request<StravaConnectionRead>("/api/v1/strava/connection", token);
}

export function createStravaAuthorization(token: string) {
  return request<StravaConnectResponse>("/api/v1/strava/connection/authorize", token, {
    method: "POST",
  });
}

export function disconnectStrava(token: string) {
  return request<void>("/api/v1/strava/connection", token, {
    method: "DELETE",
  });
}

export function listRecentStravaActivities(token: string, page = 1, perPage = 10) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  return request<StravaRecentActivityRead[]>(
    `/api/v1/strava/activities/recent?${params.toString()}`,
    token,
  );
}

export function importStravaActivity(token: string, activityId: number, tripId: number) {
  return request<StravaImportedActivityRead>(
    `/api/v1/strava/activities/${activityId}/import`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ trip_id: tripId }),
    },
  );
}
