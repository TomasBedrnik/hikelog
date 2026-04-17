"use client";

import Image from "next/image";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import {
  ActivityPhotoRead,
  ActivityRead,
  deleteActivityPhoto,
  orderActivityPhotosByCaptureDate,
  reorderActivityPhotos,
  rotateActivityPhoto,
  UploadBatchProgress,
  uploadActivityPhotos,
} from "@/lib/activities";
import { getGlobalContent } from "@/lib/global-content";
import { ImageLightbox } from "@/components/image-lightbox";
import { useI18n } from "@/components/i18n-provider";
import { getDateLocale } from "@/lib/i18n";

const DEFAULT_RESIZE_LONG_SIDE = "1920";

function formatDateTime(value: string | null, locale: "en" | "cs") {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(getDateLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ActivityPhotoManager({
  activity,
  onPhotosChange,
}: {
  activity: ActivityRead | null;
  onPhotosChange: (photos: ActivityPhotoRead[]) => void;
}) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    | "uploading"
    | `delete-${number}`
    | `move-${number}`
    | `rotate-left-${number}`
    | `rotate-right-${number}`
    | "ordering-by-capture-date"
    | null
  >(null);
  const [files, setFiles] = useState<File[]>([]);
  const [resizeMode, setResizeMode] = useState<"keep" | "resize">("resize");
  const [resizeLongSide, setResizeLongSide] = useState(DEFAULT_RESIZE_LONG_SIDE);
  const [uploadProgress, setUploadProgress] = useState<UploadBatchProgress | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const photos = useMemo(
    () => [...(activity?.photos ?? [])].sort((a, b) => a.position - b.position || a.id - b.id),
    [activity?.photos],
  );

  useEffect(() => {
    const token = getIdToken();
    if (!token) {
      return;
    }

    getGlobalContent(token)
      .then((loaded) => {
        setResizeLongSide(String(loaded.activity_photo_resize_long_side));
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.message === "AUTH_REQUIRED") {
          clearIdToken();
          router.push("/login");
        }
      });
  }, [router]);

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

  const handleUpload = async () => {
    if (!activity?.id) {
      setError(dict.activityPhotos.saveActivityFirst);
      return;
    }

    const token = requireToken();
    if (!token) {
      return;
    }

    if (files.length === 0) {
      setError(dict.activityPhotos.filesRequired);
      return;
    }

    let width: number | null = null;
    let height: number | null = null;
    if (resizeMode === "resize") {
      const longSide = Number(resizeLongSide);
      if (!Number.isInteger(longSide) || longSide <= 0) {
        setError(dict.activityPhotos.resizeLongSideInvalid);
        return;
      }
      width = longSide;
      height = longSide;
    }

    setBusy("uploading");
    setError(null);
    setUploadProgress({
      currentFileName: files[0]?.name ?? null,
      loadedBytes: 0,
      totalBytes: files.reduce((sum, file) => sum + file.size, 0),
      uploadedFileCount: 0,
      totalFileCount: files.length,
      phase: "uploading",
    });
    try {
      let nextPhotos = photos;
      const { uploaded, failures } = await uploadActivityPhotos(
        token,
        activity.id,
        {
          files,
          resizeMode,
          resizeWidth: width,
          resizeHeight: height,
        },
        {
          onUploaded: (saved) => {
            nextPhotos = [...nextPhotos, ...saved].sort(
              (a, b) => a.position - b.position || a.id - b.id,
            );
            startTransition(() => {
              onPhotosChange(nextPhotos);
            });
          },
          onBatchProgress: setUploadProgress,
        },
      );

      setFiles([]);
      setInputKey((current) => current + 1);

      if (failures.length > 0) {
        setError(
          [
            dict.activityPhotos.uploadPartialFailure,
            ...failures.map(
              ({ fileName, message }) =>
                `${dict.activityPhotos.uploadFailedPhoto.replace("{name}", fileName)}: ${message}`,
            ),
          ].join("\n"),
        );
        return;
      }

      if (uploaded.length === 0) {
        setError(dict.common.unknownError);
      }
    } catch (e: unknown) {
      if (handleAuthError(e)) {
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    } finally {
      setBusy(null);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (photo: ActivityPhotoRead) => {
    if (!activity?.id) {
      return;
    }
    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy(`delete-${photo.id}`);
    setError(null);
    try {
      await deleteActivityPhoto(token, activity.id, photo.id);
      startTransition(() => {
        onPhotosChange(photos.filter((item) => item.id !== photo.id));
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

  const handleMove = async (photoId: number, direction: -1 | 1) => {
    if (!activity?.id) {
      return;
    }
    const token = requireToken();
    if (!token) {
      return;
    }

    const index = photos.findIndex((photo) => photo.id === photoId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= photos.length) {
      return;
    }

    const reordered = [...photos];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, item);

    setBusy(`move-${photoId}`);
    setError(null);
    try {
      const saved = await reorderActivityPhotos(
        token,
        activity.id,
        reordered.map((photo) => photo.id),
      );
      startTransition(() => {
        onPhotosChange(saved);
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

  const handleRotate = async (photo: ActivityPhotoRead, direction: "left" | "right") => {
    if (!activity?.id) {
      return;
    }
    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy(`rotate-${direction}-${photo.id}`);
    setError(null);
    try {
      const rotated = await rotateActivityPhoto(token, activity.id, photo.id, direction);
      startTransition(() => {
        onPhotosChange(photos.map((item) => (item.id === photo.id ? rotated : item)));
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

  const handleOrderByCaptureDate = async () => {
    if (!activity?.id || photos.length === 0) {
      return;
    }

    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy("ordering-by-capture-date");
    setError(null);
    try {
      const ordered = await orderActivityPhotosByCaptureDate(token, activity.id);
      startTransition(() => {
        onPhotosChange(ordered);
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
    <section className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-stone-900">{dict.activityPhotos.title}</h3>
        <p className="text-sm text-stone-500">{dict.activityPhotos.description}</p>
        <p className="text-sm text-stone-600">
          {dict.activityPhotos.totalCount.replace("{count}", String(photos.length))}
        </p>
      </div>

      {error ? (
        <p className="mt-4 whitespace-pre-line rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {busy === "uploading" && uploadProgress ? (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-4 text-sm text-stone-700">
            <span>
              {uploadProgress.phase === "processing"
                ? dict.activityPhotos.uploadProcessing
                : dict.activityPhotos.uploadProgress}
            </span>
            <span>
              {Math.round(
                uploadProgress.totalBytes > 0
                  ? (uploadProgress.loadedBytes / uploadProgress.totalBytes) * 100
                  : 0,
              )}
              %
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    uploadProgress.totalBytes > 0
                      ? (uploadProgress.loadedBytes / uploadProgress.totalBytes) * 100
                      : 0,
                  ),
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {dict.activityPhotos.uploadProgressDetail
              .replace("{loaded}", formatBytes(uploadProgress.loadedBytes))
              .replace("{total}", formatBytes(uploadProgress.totalBytes))
              .replace("{uploaded}", String(uploadProgress.uploadedFileCount))
              .replace("{count}", String(uploadProgress.totalFileCount))}
          </p>
        </div>
      ) : null}

      {!activity?.id ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm text-stone-500">
          {dict.activityPhotos.saveActivityFirst}
        </p>
      ) : (
        <>
          <div className="mt-5 rounded-[1.5rem] border border-stone-200 bg-white p-4">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">
                  {dict.activityPhotos.files}
                </span>
                <input
                  key={inputKey}
                  accept="image/jpeg,image/png"
                  className="mt-2 block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm"
                  multiple
                  onChange={(event) => {
                    setFiles(Array.from(event.target.files ?? []));
                  }}
                  type="file"
                />
                <p className="mt-2 text-xs text-stone-500">{dict.activityPhotos.filesHelp}</p>
              </label>

              <div className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                <div>
                  <p className="text-sm font-medium text-stone-700">
                    {dict.activityPhotos.resizeMode}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        checked={resizeMode === "keep"}
                        className="size-4 accent-emerald-700"
                        onChange={() => {
                          setResizeMode("keep");
                        }}
                        type="radio"
                      />
                      <span>{dict.activityPhotos.keepOriginal}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        checked={resizeMode === "resize"}
                        className="size-4 accent-emerald-700"
                        onChange={() => {
                          setResizeMode("resize");
                        }}
                        type="radio"
                      />
                      <span>{dict.activityPhotos.resizeTo}</span>
                    </label>
                  </div>
                </div>

                {resizeMode === "resize" ? (
                  <div className="grid gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">
                        {dict.activityPhotos.longSide}
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        inputMode="numeric"
                        onChange={(event) => {
                          setResizeLongSide(event.target.value);
                        }}
                        value={resizeLongSide}
                      />
                    </label>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={busy !== null}
                    onClick={() => {
                      void handleUpload();
                    }}
                    type="button"
                  >
                    {busy === "uploading"
                      ? dict.activityPhotos.uploading
                      : dict.activityPhotos.upload}
                  </button>
                  <button
                    className="rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={busy !== null || photos.length < 2}
                    onClick={() => {
                      void handleOrderByCaptureDate();
                    }}
                    type="button"
                  >
                    {busy === "ordering-by-capture-date"
                      ? dict.activityPhotos.orderingByCaptureDate
                      : dict.activityPhotos.orderByCaptureDate}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {photos.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm text-stone-500">
              {dict.activityPhotos.empty}
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {photos.map((photo, index) => (
                <article
                  key={photo.id}
                  className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm"
                >
                  <div className="relative">
                    <button
                      className="block w-full"
                      onClick={() => {
                        setSelectedPhotoIndex(index);
                      }}
                      type="button"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={photo.original_filename ?? dict.activityPhotos.imageAlt}
                        className="h-56 w-full bg-stone-200 object-cover"
                        loading="lazy"
                        src={photo.thumbnail_url}
                      />
                    </button>

                    <div className="flex flex-col p-2 pl-4 text-sm text-stone-700 items-start">
                      <span>{photo.original_filename ?? ""}</span>
                      <span>{formatDateTime(photo.capture_datetime, locale)}</span>
                    </div>
                    <div className="absolute left-3 top-3 flex gap-2">
                      <button
                        aria-label={dict.activityPhotos.moveEarlier}
                        className="rounded-full bg-white/92 px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-white disabled:opacity-50"
                        disabled={busy !== null || index === 0}
                        onClick={() => {
                          void handleMove(photo.id, -1);
                        }}
                        type="button"
                      >
                        {dict.activityPhotos.moveEarlierArrow}
                      </button>
                      <button
                        aria-label={dict.activityPhotos.moveLater}
                        className="rounded-full bg-white/92 px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-white disabled:opacity-50"
                        disabled={busy !== null || index === photos.length - 1}
                        onClick={() => {
                          void handleMove(photo.id, 1);
                        }}
                        type="button"
                      >
                        {dict.activityPhotos.moveLaterArrow}
                      </button>
                      <button
                        aria-label={dict.activityPhotos.rotateLeft}
                        className="rounded-full bg-white/92 p-2 text-stone-700 shadow-sm transition hover:bg-white disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() => {
                          void handleRotate(photo, "left");
                        }}
                        type="button"
                      >
                        <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
                          <path
                            d="M9 7H4v5"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                          <path
                            d="M20 11a8 8 0 1 0-2.34 5.66L20 14"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                      <button
                        aria-label={dict.activityPhotos.rotateRight}
                        className="rounded-full bg-white/92 p-2 text-stone-700 shadow-sm transition hover:bg-white disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() => {
                          void handleRotate(photo, "right");
                        }}
                        type="button"
                      >
                        <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
                          <path
                            d="M15 7h5v5"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                          <path
                            d="M4 11a8 8 0 1 1 2.34 5.66L4 14"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="absolute bottom-3 right-3">
                      <button
                        aria-label={dict.activityPhotos.delete}
                        className="rounded-full bg-red-600 p-2 text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() => {
                          void handleDelete(photo);
                        }}
                        type="button"
                      >
                        <Image
                          alt=""
                          aria-hidden="true"
                          className="invert"
                          height={16}
                          src="/icons/trash-light.svg"
                          width={16}
                        />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <ImageLightbox
        items={photos.map((photo) => ({
          imageUrl: photo.image_url,
          alt: photo.original_filename ?? dict.activityPhotos.imageAlt,
          label: photo.original_filename,
        }))}
        onClose={() => {
          setSelectedPhotoIndex(null);
        }}
        onSelect={setSelectedPhotoIndex}
        selectedIndex={selectedPhotoIndex}
      />
    </section>
  );
}
