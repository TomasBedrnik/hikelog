import { TripContent } from "@/lib/trips";

export type GlobalContentRead = {
  id: number;
  main_headline: string | null;
  home_content: TripContent;
  enabled_language_codes: string[];
  activity_photo_resize_long_side: number;
  activity_video_max_upload_size_mb: number;
  activity_audio_transcription_language_code: string | null;
  activity_audio_transcription_model: string;
  activity_audio_transcription_enable_automatic_punctuation: boolean;
  activity_audio_transcription_profanity_filter: boolean;
  activity_audio_transcription_ai_prompt: string | null;
  activity_audio_enhancement_openai_model: string;
  hero_image_url: string | null;
  hero_thumbnail_url: string | null;
  hero_tiny_thumbnail_url: string | null;
  hero_width: number | null;
  hero_height: number | null;
  hero_thumbnail_width: number | null;
  hero_thumbnail_height: number | null;
  hero_tiny_thumbnail_width: number | null;
  hero_tiny_thumbnail_height: number | null;
  hero_content_type: string | null;
  hero_original_filename: string | null;
  created_at: string;
  updated_at: string;
};

export type GlobalContentUpdate = {
  main_headline: string | null;
  home_content: TripContent;
  enabled_language_codes: string[];
  activity_photo_resize_long_side: number;
  activity_video_max_upload_size_mb: number;
  activity_audio_transcription_language_code: string | null;
  activity_audio_transcription_model: string;
  activity_audio_transcription_enable_automatic_punctuation: boolean;
  activity_audio_transcription_profanity_filter: boolean;
  activity_audio_transcription_ai_prompt: string | null;
  activity_audio_enhancement_openai_model: string;
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

export function getGlobalContent(token: string) {
  return request<GlobalContentRead>("/api/v1/global-content", token);
}

export function updateGlobalContent(token: string, payload: GlobalContentUpdate) {
  return request<GlobalContentRead>("/api/v1/global-content", token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function uploadGlobalHeroImage(
  token: string,
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

  return requestMultipart<GlobalContentRead>("/api/v1/global-content/hero-image", token, body, {
    method: "POST",
  });
}

export function deleteGlobalHeroImage(token: string) {
  return request<GlobalContentRead>("/api/v1/global-content/hero-image", token, {
    method: "DELETE",
  });
}

export function rotateGlobalHeroImage(token: string) {
  return request<GlobalContentRead>("/api/v1/global-content/hero-image/rotate", token, {
    method: "PATCH",
  });
}
