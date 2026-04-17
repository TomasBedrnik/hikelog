import { CommentRead } from "@/lib/comments";

export type TripContent = Record<string, unknown> | null;

export type TripImageRead = {
  id: number;
  trip_id: number;
  position: number;
  image_url: string;
  thumbnail_url: string;
  tiny_thumbnail_url: string | null;
  width: number;
  height: number;
  thumbnail_width: number;
  thumbnail_height: number;
  tiny_thumbnail_width: number | null;
  tiny_thumbnail_height: number | null;
  content_type: string;
  original_filename: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  created_at: string;
};

export type TripRead = {
  id: number;
  name: string;
  content: TripContent;
  start_date: string | null;
  end_date: string | null;
  timezone: string | null;
  country_codes: string[];
  planned_distance_m: number | null;
  planned_path_polyline: string | null;
  show_planned_path: boolean;
  map_card_image_url: string | null;
  map_card_width: number | null;
  map_card_height: number | null;
  map_card_content_type: string | null;
  comments: CommentRead[];
  latitude: number | null;
  longitude: number | null;
  zoom: number | null;
  metrics_config: Record<string, unknown>;
  images: TripImageRead[];
  created_at: string;
};

export type TripWrite = {
  name: string;
  content: TripContent;
  start_date: string | null;
  end_date: string | null;
  timezone: string | null;
  country_codes: string[];
  planned_distance_m: number | null;
  planned_path_polyline: string | null;
  show_planned_path: boolean;
  latitude: number | null;
  longitude: number | null;
  zoom: number | null;
  metrics_config: Record<string, unknown>;
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

export function listTrips(token: string) {
  return request<TripRead[]>("/api/v1/trips", token);
}

export function createTrip(token: string, payload: TripWrite) {
  return request<TripRead>("/api/v1/trips", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTrip(token: string, tripId: number, payload: TripWrite) {
  return request<TripRead>(`/api/v1/trips/${tripId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteTrip(token: string, tripId: number) {
  return request<void>(`/api/v1/trips/${tripId}`, token, {
    method: "DELETE",
  });
}

export function uploadTripGpx(
  token: string,
  tripId: number,
  payload: {
    file: File;
    compress: boolean;
  },
) {
  const body = new FormData();
  body.append("file", payload.file);
  body.append("compress", String(payload.compress));

  return requestMultipart<TripRead>(`/api/v1/trips/${tripId}/gpx`, token, body, {
    method: "POST",
  });
}

async function requestMultipart<T>(
  path: string,
  token: string,
  body: FormData,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    body,
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

export function uploadTripImages(
  token: string,
  tripId: number,
  payload: {
    files: File[];
    resizeMode: "keep" | "resize";
    resizeWidth: number | null;
    resizeHeight: number | null;
  },
) {
  const body = new FormData();
  for (const file of payload.files) {
    body.append("files", file);
  }
  body.append("resize_mode", payload.resizeMode);
  if (payload.resizeMode === "resize") {
    body.append("resize_width", String(payload.resizeWidth ?? ""));
    body.append("resize_height", String(payload.resizeHeight ?? ""));
  }

  return requestMultipart<TripImageRead[]>(`/api/v1/trips/${tripId}/images`, token, body, {
    method: "POST",
  });
}

export function deleteTripImage(token: string, tripId: number, imageId: number) {
  return request<void>(`/api/v1/trips/${tripId}/images/${imageId}`, token, {
    method: "DELETE",
  });
}

export function reorderTripImages(token: string, tripId: number, orderedImageIds: number[]) {
  return request<TripImageRead[]>(`/api/v1/trips/${tripId}/images/order`, token, {
    method: "PUT",
    body: JSON.stringify({ ordered_image_ids: orderedImageIds }),
  });
}

export function rotateTripImage(token: string, tripId: number, imageId: number) {
  return request<TripImageRead>(`/api/v1/trips/${tripId}/images/${imageId}/rotate`, token, {
    method: "PATCH",
  });
}

export function uploadTripMapCardImage(
  token: string,
  tripId: number,
  payload: {
    file: File;
    resizeMode: "keep" | "resize";
    resizeWidth: number | null;
    resizeHeight: number | null;
  },
) {
  const body = new FormData();
  body.append("file", payload.file);
  body.append("resize_mode", payload.resizeMode);
  if (payload.resizeMode === "resize") {
    body.append("resize_width", String(payload.resizeWidth ?? ""));
    body.append("resize_height", String(payload.resizeHeight ?? ""));
  }

  return requestMultipart<TripRead>(`/api/v1/trips/${tripId}/map-card-image`, token, body, {
    method: "POST",
  });
}

export function deleteTripMapCardImage(token: string, tripId: number) {
  return request<TripRead>(`/api/v1/trips/${tripId}/map-card-image`, token, {
    method: "DELETE",
  });
}

export function deleteTripComment(token: string, tripId: number, commentId: number) {
  return request<CommentRead>(`/api/v1/trips/${tripId}/comments/${commentId}`, token, {
    method: "DELETE",
  });
}

export function rotateTripMapCardImage(token: string, tripId: number) {
  return request<TripRead>(`/api/v1/trips/${tripId}/map-card-image/rotate`, token, {
    method: "PATCH",
  });
}
