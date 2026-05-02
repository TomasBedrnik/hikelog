import axios from "axios";

import { CommentRead } from "@/lib/comments";

export type ActivityContent = Record<string, unknown> | null;

export type ActivityPhotoRead = {
  id: number;
  activity_id: number;
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
  capture_datetime: string | null;
  created_at: string;
};

export type ActivityAudioRead = {
  id: number;
  activity_id: number;
  audio_url: string;
  content_type: string;
  original_filename: string | null;
  transcription_raw: string | null;
  transcription_enhanced: string | null;
  created_at: string;
};

export type ActivityVideoRead = {
  id: number;
  activity_id: number;
  position: number;
  original_video_url: string;
  compressed_video_url: string | null;
  thumbnail_url: string | null;
  tiny_thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  content_type: string;
  original_filename: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  capture_datetime: string | null;
  created_at: string;
};

export type ActivityPhotoUploadFailure = {
  fileName: string;
  message: string;
};

export type ActivityPhotoUploadResult = {
  uploaded: ActivityPhotoRead[];
  failures: ActivityPhotoUploadFailure[];
};

export type ActivityAudioUploadFailure = {
  fileName: string;
  message: string;
};

export type ActivityAudioUploadResult = {
  uploaded: ActivityAudioRead[];
  failures: ActivityAudioUploadFailure[];
};

export type ActivityVideoUploadFailure = {
  fileName: string;
  message: string;
};

export type ActivityVideoUploadResult = {
  uploaded: ActivityVideoRead[];
  failures: ActivityVideoUploadFailure[];
};

export type UploadBatchProgress = {
  currentFileName: string | null;
  loadedBytes: number;
  totalBytes: number;
  uploadedFileCount: number;
  totalFileCount: number;
  phase: "uploading" | "processing";
};

export type UploadFileProgress = {
  fileName: string;
  loadedBytes: number;
  totalBytes: number;
  phase: "pending" | "uploading" | "processing" | "completed" | "failed";
};

export type ActivityRead = {
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
  description: ActivityContent;
  polyline: string | null;
  summary_polyline: string | null;
  comments: CommentRead[];
  photos: ActivityPhotoRead[];
  videos: ActivityVideoRead[];
  audios: ActivityAudioRead[];
  created_at: string;
};

export type ActivitySummaryRead = {
  id: number;
  trip_id: number;
  name: string;
  type: string | null;
  sport_type: string | null;
  start_date: string | null;
  timezone: string | null;
  distance: number | null;
  moving_time: number | null;
  elapsed_time: number | null;
  total_elevation_gain: number | null;
  description: ActivityContent;
  summary_polyline: string | null;
  photos: ActivityPhotoRead[];
  videos: ActivityVideoRead[];
};

export type ActivityListItemRead = {
  id: number;
  trip_id: number;
  name: string;
  start_date: string | null;
  timezone: string | null;
};

export type ActivityWrite = {
  trip_id: number;
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
  description: ActivityContent;
  polyline: string | null;
  summary_polyline: string | null;
};

export function sortActivitiesByStartDate<T extends { id: number; start_date: string | null }>(
  activities: T[],
) {
  return [...activities].sort((left, right) => {
    const leftTime = left.start_date
      ? new Date(left.start_date).getTime()
      : Number.NEGATIVE_INFINITY;
    const rightTime = right.start_date
      ? new Date(right.start_date).getTime()
      : Number.NEGATIVE_INFINITY;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return right.id - left.id;
  });
}

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

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

async function requestMultipartWithAxios<T>(
  path: string,
  token: string,
  body: FormData,
  options?: {
    onUploadProgress?: (loadedBytes: number, totalBytes: number) => void;
  },
): Promise<T> {
  try {
    const res = await axios.request<T>({
      url: `${getApiBaseUrl()}${path}`,
      method: "POST",
      data: body,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: false,
      onUploadProgress: (event) => {
        const totalBytes = event.total ?? 0;
        options?.onUploadProgress?.(event.loaded, totalBytes);
      },
    });

    return res.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        throw new Error("AUTH_REQUIRED");
      }

      const data = error.response?.data;
      if (typeof data === "string" && data.trim()) {
        throw new Error(data);
      }

      if (data && typeof data === "object") {
        throw new Error(JSON.stringify(data));
      }

      throw new Error(error.message || "Request failed");
    }

    throw error;
  }
}

function formatRequestErrorMessage(message: string) {
  try {
    const parsed = JSON.parse(message) as { detail?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      return parsed.detail;
    }
  } catch {
    return message;
  }

  return message;
}

export function listActivities(token: string, options?: { tripId?: number }) {
  const searchParams = new URLSearchParams();
  if (options?.tripId !== undefined) {
    searchParams.set("trip_id", String(options.tripId));
  }
  const query = searchParams.toString();
  return request<ActivityRead[]>(`/api/v1/activities${query ? `?${query}` : ""}`, token);
}

export function listActivitySummaries(token: string, tripId: number) {
  return request<ActivityListItemRead[]>(`/api/v1/activities/summaries?trip_id=${tripId}`, token);
}

export function getActivity(token: string, activityId: number) {
  return request<ActivityRead>(`/api/v1/activities/${activityId}`, token);
}

export function createActivity(token: string, payload: ActivityWrite) {
  return request<ActivityRead>("/api/v1/activities", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateActivity(token: string, activityId: number, payload: ActivityWrite) {
  return request<ActivityRead>(`/api/v1/activities/${activityId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteActivity(token: string, activityId: number) {
  return request<void>(`/api/v1/activities/${activityId}`, token, {
    method: "DELETE",
  });
}

export function uploadActivityPhotos(
  token: string,
  activityId: number,
  payload: {
    files: File[];
    resizeMode: "keep" | "resize";
    resizeWidth: number | null;
    resizeHeight: number | null;
  },
  options?: {
    onUploaded?: (uploaded: ActivityPhotoRead[]) => void;
    onBatchProgress?: (progress: UploadBatchProgress) => void;
  },
) {
  const totalBytes = payload.files.reduce((sum, file) => sum + file.size, 0);
  const runUpload = async (): Promise<ActivityPhotoUploadResult> => {
    const uploaded: ActivityPhotoRead[] = [];
    const failures: ActivityPhotoUploadFailure[] = [];
    let uploadedBytesSoFar = 0;
    let uploadedFileCount = 0;
    for (const file of payload.files) {
      let latestLoadedBytes = 0;
      try {
        const saved = await requestMultipartWithAxios<ActivityPhotoRead[]>(
          `/api/v1/activities/${activityId}/photos`,
          token,
          (() => {
            const body = new FormData();
            body.append("files", file);
            body.append("resize_mode", payload.resizeMode);
            if (payload.resizeMode === "resize") {
              body.append("resize_width", String(payload.resizeWidth ?? ""));
              body.append("resize_height", String(payload.resizeHeight ?? ""));
            }
            return body;
          })(),
          {
            onUploadProgress: (loadedBytes, requestTotalBytes) => {
              latestLoadedBytes = loadedBytes;
              const totalForFile = requestTotalBytes || file.size;
              options?.onBatchProgress?.({
                currentFileName: file.name,
                loadedBytes: uploadedBytesSoFar + Math.min(loadedBytes, file.size),
                totalBytes,
                uploadedFileCount,
                totalFileCount: payload.files.length,
                phase: loadedBytes >= totalForFile ? "processing" : "uploading",
              });
            },
          },
        );
        uploaded.push(...saved);
        uploadedBytesSoFar += file.size;
        uploadedFileCount += 1;
        options?.onBatchProgress?.({
          currentFileName: null,
          loadedBytes: uploadedBytesSoFar,
          totalBytes,
          uploadedFileCount,
          totalFileCount: payload.files.length,
          phase: "uploading",
        });
        options?.onUploaded?.(saved);
      } catch (e: unknown) {
        if (e instanceof Error && e.message === "AUTH_REQUIRED") {
          throw e;
        }

        uploadedBytesSoFar += Math.min(latestLoadedBytes, file.size);
        options?.onBatchProgress?.({
          currentFileName: null,
          loadedBytes: uploadedBytesSoFar,
          totalBytes,
          uploadedFileCount,
          totalFileCount: payload.files.length,
          phase: "uploading",
        });

        const detail = formatRequestErrorMessage(e instanceof Error ? e.message : "Unknown error");
        failures.push({
          fileName: file.name,
          message: detail,
        });
      }
    }
    return {
      uploaded,
      failures,
    };
  };

  return runUpload();
}

export function uploadActivityAudios(
  token: string,
  activityId: number,
  files: File[],
  options?: {
    onUploaded?: (uploaded: ActivityAudioRead[]) => void;
    onBatchProgress?: (progress: UploadBatchProgress) => void;
  },
) {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const runUpload = async (): Promise<ActivityAudioUploadResult> => {
    const uploaded: ActivityAudioRead[] = [];
    const failures: ActivityAudioUploadFailure[] = [];
    let uploadedBytesSoFar = 0;
    let uploadedFileCount = 0;
    for (const file of files) {
      let latestLoadedBytes = 0;
      try {
        const body = new FormData();
        body.append("files", file);

        const saved = await requestMultipartWithAxios<ActivityAudioRead[]>(
          `/api/v1/activities/${activityId}/audios`,
          token,
          body,
          {
            onUploadProgress: (loadedBytes, requestTotalBytes) => {
              latestLoadedBytes = loadedBytes;
              const totalForFile = requestTotalBytes || file.size;
              options?.onBatchProgress?.({
                currentFileName: file.name,
                loadedBytes: uploadedBytesSoFar + Math.min(loadedBytes, file.size),
                totalBytes,
                uploadedFileCount,
                totalFileCount: files.length,
                phase: loadedBytes >= totalForFile ? "processing" : "uploading",
              });
            },
          },
        );
        uploaded.push(...saved);
        uploadedBytesSoFar += file.size;
        uploadedFileCount += 1;
        options?.onBatchProgress?.({
          currentFileName: null,
          loadedBytes: uploadedBytesSoFar,
          totalBytes,
          uploadedFileCount,
          totalFileCount: files.length,
          phase: "uploading",
        });
        options?.onUploaded?.(saved);
      } catch (e: unknown) {
        if (e instanceof Error && e.message === "AUTH_REQUIRED") {
          throw e;
        }

        uploadedBytesSoFar += Math.min(latestLoadedBytes, file.size);
        options?.onBatchProgress?.({
          currentFileName: null,
          loadedBytes: uploadedBytesSoFar,
          totalBytes,
          uploadedFileCount,
          totalFileCount: files.length,
          phase: "uploading",
        });

        const detail = formatRequestErrorMessage(e instanceof Error ? e.message : "Unknown error");
        failures.push({
          fileName: file.name,
          message: detail,
        });
      }
    }
    return {
      uploaded,
      failures,
    };
  };

  return runUpload();
}

export function uploadActivityVideos(
  token: string,
  activityId: number,
  files: File[],
  options?: {
    onUploaded?: (uploaded: ActivityVideoRead[]) => void;
    onBatchProgress?: (progress: UploadBatchProgress) => void;
    onFileProgress?: (progress: UploadFileProgress) => void;
  },
) {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const runUpload = async (): Promise<ActivityVideoUploadResult> => {
    const uploaded: ActivityVideoRead[] = [];
    const failures: ActivityVideoUploadFailure[] = [];
    let uploadedBytesSoFar = 0;
    let uploadedFileCount = 0;
    for (const file of files) {
      options?.onFileProgress?.({
        fileName: file.name,
        loadedBytes: 0,
        totalBytes: file.size,
        phase: "pending",
      });
    }
    for (const file of files) {
      let latestLoadedBytes = 0;
      try {
        const body = new FormData();
        body.append("files", file);

        const saved = await requestMultipartWithAxios<ActivityVideoRead[]>(
          `/api/v1/activities/${activityId}/videos`,
          token,
          body,
          {
            onUploadProgress: (loadedBytes, requestTotalBytes) => {
              latestLoadedBytes = loadedBytes;
              const totalForFile = requestTotalBytes || file.size;
              const phase = loadedBytes >= totalForFile ? "processing" : "uploading";
              options?.onBatchProgress?.({
                currentFileName: file.name,
                loadedBytes: uploadedBytesSoFar + Math.min(loadedBytes, file.size),
                totalBytes,
                uploadedFileCount,
                totalFileCount: files.length,
                phase,
              });
              options?.onFileProgress?.({
                fileName: file.name,
                loadedBytes: Math.min(loadedBytes, file.size),
                totalBytes: file.size,
                phase,
              });
            },
          },
        );
        uploaded.push(...saved);
        uploadedBytesSoFar += file.size;
        uploadedFileCount += 1;
        options?.onBatchProgress?.({
          currentFileName: null,
          loadedBytes: uploadedBytesSoFar,
          totalBytes,
          uploadedFileCount,
          totalFileCount: files.length,
          phase: "uploading",
        });
        options?.onFileProgress?.({
          fileName: file.name,
          loadedBytes: file.size,
          totalBytes: file.size,
          phase: "completed",
        });
        options?.onUploaded?.(saved);
      } catch (e: unknown) {
        if (e instanceof Error && e.message === "AUTH_REQUIRED") {
          throw e;
        }

        uploadedBytesSoFar += Math.min(latestLoadedBytes, file.size);
        options?.onBatchProgress?.({
          currentFileName: null,
          loadedBytes: uploadedBytesSoFar,
          totalBytes,
          uploadedFileCount,
          totalFileCount: files.length,
          phase: "uploading",
        });
        options?.onFileProgress?.({
          fileName: file.name,
          loadedBytes: Math.min(latestLoadedBytes, file.size),
          totalBytes: file.size,
          phase: "failed",
        });

        const detail = formatRequestErrorMessage(e instanceof Error ? e.message : "Unknown error");
        failures.push({
          fileName: file.name,
          message: detail,
        });
      }
    }
    return {
      uploaded,
      failures,
    };
  };

  return runUpload();
}

export function deleteActivityAudio(token: string, activityId: number, audioId: number) {
  return request<void>(`/api/v1/activities/${activityId}/audios/${audioId}`, token, {
    method: "DELETE",
  });
}

export function transcribeActivityAudio(token: string, activityId: number, audioId: number) {
  return request<ActivityAudioRead>(
    `/api/v1/activities/${activityId}/audios/${audioId}/transcribe`,
    token,
    {
      method: "POST",
    },
  );
}

export function enhanceActivityAudioTranscription(
  token: string,
  activityId: number,
  audioId: number,
) {
  return request<ActivityAudioRead>(
    `/api/v1/activities/${activityId}/audios/${audioId}/enhance`,
    token,
    {
      method: "POST",
    },
  );
}

export function copyActivityAudioEnhancedTranscriptionToDescription(
  token: string,
  activityId: number,
  audioId: number,
) {
  return request<ActivityRead>(
    `/api/v1/activities/${activityId}/audios/${audioId}/copy-enhanced-to-description`,
    token,
    {
      method: "POST",
    },
  );
}

export function deleteActivityPhoto(token: string, activityId: number, photoId: number) {
  return request<void>(`/api/v1/activities/${activityId}/photos/${photoId}`, token, {
    method: "DELETE",
  });
}

export function deleteActivityVideo(token: string, activityId: number, videoId: number) {
  return request<void>(`/api/v1/activities/${activityId}/videos/${videoId}`, token, {
    method: "DELETE",
  });
}

export function reorderActivityPhotos(
  token: string,
  activityId: number,
  orderedPhotoIds: number[],
) {
  return request<ActivityPhotoRead[]>(`/api/v1/activities/${activityId}/photos/order`, token, {
    method: "PUT",
    body: JSON.stringify({ ordered_photo_ids: orderedPhotoIds }),
  });
}

export function orderActivityPhotosByCaptureDate(token: string, activityId: number) {
  return request<ActivityPhotoRead[]>(
    `/api/v1/activities/${activityId}/photos/order-by-capture-date`,
    token,
    {
      method: "POST",
    },
  );
}

export function reorderActivityVideos(
  token: string,
  activityId: number,
  orderedVideoIds: number[],
) {
  return request<ActivityVideoRead[]>(`/api/v1/activities/${activityId}/videos/order`, token, {
    method: "PUT",
    body: JSON.stringify({ ordered_video_ids: orderedVideoIds }),
  });
}

export function orderActivityVideosByCaptureDate(token: string, activityId: number) {
  return request<ActivityVideoRead[]>(
    `/api/v1/activities/${activityId}/videos/order-by-capture-date`,
    token,
    {
      method: "POST",
    },
  );
}

export function rotateActivityPhoto(
  token: string,
  activityId: number,
  photoId: number,
  direction: "left" | "right",
) {
  return request<ActivityPhotoRead>(
    `/api/v1/activities/${activityId}/photos/${photoId}/rotate?direction=${direction}`,
    token,
    {
      method: "PATCH",
    },
  );
}

export function deleteActivityComment(token: string, activityId: number, commentId: number) {
  return request<CommentRead>(`/api/v1/activities/${activityId}/comments/${commentId}`, token, {
    method: "DELETE",
  });
}

export function uploadActivityGpx(token: string, activityId: number, file: File) {
  const body = new FormData();
  body.append("file", file);

  return requestMultipart<ActivityRead>(`/api/v1/activities/${activityId}/gpx`, token, body, {
    method: "POST",
  });
}
