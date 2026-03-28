"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import {
  ActivityPhotoRead,
  ActivityRead,
  deleteActivityPhoto,
  reorderActivityPhotos,
  uploadActivityPhotos,
} from "@/lib/activities";
import { useI18n } from "@/components/i18n-provider";
import { getDateLocale } from "@/lib/i18n";

const DEFAULT_WIDTH = "1920";
const DEFAULT_HEIGHT = "1080";

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
  const [busy, setBusy] = useState<"uploading" | `delete-${number}` | `move-${number}` | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [resizeMode, setResizeMode] = useState<"keep" | "resize">("keep");
  const [resizeWidth, setResizeWidth] = useState(DEFAULT_WIDTH);
  const [resizeHeight, setResizeHeight] = useState(DEFAULT_HEIGHT);
  const [inputKey, setInputKey] = useState(0);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const photos = useMemo(
    () => [...(activity?.photos ?? [])].sort((a, b) => a.position - b.position || a.id - b.id),
    [activity?.photos],
  );

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    window.setTimeout(() => {
      setCopiedValue((current) => (current === value ? null : current));
    }, 1500);
  };

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
      width = Number(resizeWidth);
      height = Number(resizeHeight);
      if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
        setError(dict.activityPhotos.resizeInvalid);
        return;
      }
    }

    setBusy("uploading");
    setError(null);
    try {
      const uploaded = await uploadActivityPhotos(token, activity.id, {
        files,
        resizeMode,
        resizeWidth: width,
        resizeHeight: height,
      });
      startTransition(() => {
        onPhotosChange([...photos, ...uploaded].sort((a, b) => a.position - b.position || a.id - b.id));
      });
      setFiles([]);
      setInputKey((current) => current + 1);
    } catch (e: unknown) {
      if (handleAuthError(e)) {
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    } finally {
      setBusy(null);
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

  return (
    <section className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-stone-900">{dict.activityPhotos.title}</h3>
        <p className="text-sm text-stone-500">{dict.activityPhotos.description}</p>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {!activity?.id ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm text-stone-500">{dict.activityPhotos.saveActivityFirst}</p>
      ) : (
        <>
          <div className="mt-5 rounded-[1.5rem] border border-stone-200 bg-white p-4">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">{dict.activityPhotos.files}</span>
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
                  <p className="text-sm font-medium text-stone-700">{dict.activityPhotos.resizeMode}</p>
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">{dict.activityPhotos.width}</span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        inputMode="numeric"
                        onChange={(event) => {
                          setResizeWidth(event.target.value);
                        }}
                        value={resizeWidth}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">{dict.activityPhotos.height}</span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        inputMode="numeric"
                        onChange={(event) => {
                          setResizeHeight(event.target.value);
                        }}
                        value={resizeHeight}
                      />
                    </label>
                  </div>
                ) : null}

                <button
                  className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => {
                    void handleUpload();
                  }}
                  type="button"
                >
                  {busy === "uploading" ? dict.activityPhotos.uploading : dict.activityPhotos.upload}
                </button>
              </div>
            </div>
          </div>

          {photos.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm text-stone-500">{dict.activityPhotos.empty}</p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {photos.map((photo, index) => (
                <article
                  key={photo.id}
                  className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm"
                >
                  <a href={photo.image_url} rel="noreferrer" target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={photo.original_filename ?? dict.activityPhotos.imageAlt}
                      className="h-56 w-full bg-stone-200 object-cover"
                      loading="lazy"
                      src={photo.thumbnail_url}
                    />
                  </a>

                  <div className="space-y-4 px-4 py-4">
                    <div>
                      <p className="truncate text-sm font-medium text-stone-900">
                        {photo.original_filename ?? dict.activityPhotos.imageAlt}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {dict.activityPhotos.positionLabel} {index + 1} · {photo.width} x {photo.height} ·{" "}
                        {new Date(photo.created_at).toLocaleString(getDateLocale(locale))}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
                        disabled={busy !== null || index === 0}
                        onClick={() => {
                          void handleMove(photo.id, -1);
                        }}
                        type="button"
                      >
                        {dict.activityPhotos.moveEarlier}
                      </button>
                      <button
                        className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
                        disabled={busy !== null || index === photos.length - 1}
                        onClick={() => {
                          void handleMove(photo.id, 1);
                        }}
                        type="button"
                      >
                        {dict.activityPhotos.moveLater}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="rounded-2xl bg-stone-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                          {dict.activityPhotos.originalUrl}
                        </p>
                        <p className="mt-2 break-all text-xs leading-5 text-stone-600">{photo.image_url}</p>
                        <button
                          className="mt-3 rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                          onClick={() => {
                            void copyText(photo.image_url);
                          }}
                          type="button"
                        >
                          {copiedValue === photo.image_url ? dict.activityPhotos.copied : dict.activityPhotos.copyOriginal}
                        </button>
                      </div>

                      <div className="rounded-2xl bg-stone-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                          {dict.activityPhotos.thumbnailUrl}
                        </p>
                        <p className="mt-2 break-all text-xs leading-5 text-stone-600">{photo.thumbnail_url}</p>
                        <button
                          className="mt-3 rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                          onClick={() => {
                            void copyText(photo.thumbnail_url);
                          }}
                          type="button"
                        >
                          {copiedValue === photo.thumbnail_url
                            ? dict.activityPhotos.copied
                            : dict.activityPhotos.copyThumbnail}
                        </button>
                      </div>
                    </div>

                    <button
                      className="rounded-full border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={() => {
                        void handleDelete(photo);
                      }}
                      type="button"
                    >
                      {busy === `delete-${photo.id}` ? dict.activityPhotos.deleting : dict.activityPhotos.delete}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
