export type GalleryImageRead = {
  id: number;
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

  return (await res.json()) as T;
}

export function listGalleryImages(token: string) {
  return request<GalleryImageRead[]>("/api/v1/gallery", token);
}

export function uploadGalleryImages(
  token: string,
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

  return requestMultipart<GalleryImageRead[]>("/api/v1/gallery", token, body, {
    method: "POST",
  });
}

export function deleteGalleryImage(token: string, imageId: number) {
  return request<void>(`/api/v1/gallery/${imageId}`, token, {
    method: "DELETE",
  });
}

export function rotateGalleryImage(token: string, imageId: number) {
  return request<GalleryImageRead>(`/api/v1/gallery/${imageId}/rotate`, token, {
    method: "PATCH",
  });
}
