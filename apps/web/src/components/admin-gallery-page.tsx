"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import { ImageLightbox } from "@/components/image-lightbox";
import { useI18n } from "@/components/i18n-provider";
import {
  GalleryImageRead,
  deleteGalleryImage,
  listGalleryImages,
  rotateGalleryImage,
  uploadGalleryImages,
} from "@/lib/gallery";
import { getDateLocale } from "@/lib/i18n";

const DEFAULT_GALLERY_WIDTH = "1920";
const DEFAULT_GALLERY_HEIGHT = "1080";

export function AdminGalleryPage() {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const [images, setImages] = useState<GalleryImageRead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"uploading" | `delete-${number}` | `rotate-${number}` | null>(
    null,
  );
  const [files, setFiles] = useState<File[]>([]);
  const [resizeMode, setResizeMode] = useState<"keep" | "resize">("keep");
  const [resizeWidth, setResizeWidth] = useState(DEFAULT_GALLERY_WIDTH);
  const [resizeHeight, setResizeHeight] = useState(DEFAULT_GALLERY_HEIGHT);
  const [inputKey, setInputKey] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  useEffect(() => {
    const token = getIdToken();
    if (!token) {
      router.push("/login");
      return;
    }

    listGalleryImages(token)
      .then((data) => {
        setImages(data);
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.message === "AUTH_REQUIRED") {
          clearIdToken();
          router.push("/login");
          return;
        }
        setError(e instanceof Error ? e.message : dict.common.unknownError);
      });
  }, [dict.common.unknownError, router]);

  const uploadImages = async () => {
    const token = getIdToken();
    if (!token) {
      router.push("/login");
      return;
    }

    if (files.length === 0) {
      setError(dict.gallery.filesRequired);
      return;
    }

    let width: number | null = null;
    let height: number | null = null;

    if (resizeMode === "resize") {
      width = Number(resizeWidth);
      height = Number(resizeHeight);
      if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
        setError(dict.gallery.resizeInvalid);
        return;
      }
    }

    setBusy("uploading");
    setError(null);

    try {
      const uploaded = await uploadGalleryImages(token, {
        files,
        resizeMode,
        resizeWidth: width,
        resizeHeight: height,
      });

      startTransition(() => {
        setImages((current) => [...uploaded, ...(current ?? [])]);
      });
      setFiles([]);
      setInputKey((current) => current + 1);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "AUTH_REQUIRED") {
        clearIdToken();
        router.push("/login");
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    } finally {
      setBusy(null);
    }
  };

  const removeImage = async (image: GalleryImageRead) => {
    const token = getIdToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setBusy(`delete-${image.id}`);
    setError(null);

    try {
      await deleteGalleryImage(token, image.id);
      startTransition(() => {
        setImages((current) => (current ?? []).filter((item) => item.id !== image.id));
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "AUTH_REQUIRED") {
        clearIdToken();
        router.push("/login");
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    } finally {
      setBusy(null);
    }
  };

  const rotateImage = async (image: GalleryImageRead) => {
    const token = getIdToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setBusy(`rotate-${image.id}`);
    setError(null);

    try {
      const rotated = await rotateGalleryImage(token, image.id);
      startTransition(() => {
        setImages((current) =>
          (current ?? []).map((item) => (item.id === image.id ? rotated : item)),
        );
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "AUTH_REQUIRED") {
        clearIdToken();
        router.push("/login");
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="mx-auto mt-6 max-w-7xl border-t border-stone-300 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">{dict.gallery.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-600">{dict.gallery.description}</p>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {!images && !error && <p className="mt-4 text-sm text-stone-600">{dict.common.loading}</p>}

        <section className="mt-6 border-t border-stone-200 pt-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">{dict.gallery.files}</span>
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
              <p className="mt-2 text-xs text-stone-500">{dict.gallery.filesHelp}</p>
            </label>

            <div className="space-y-4 border-t border-stone-200 pt-4">
              <div>
                <p className="text-sm font-medium text-stone-700">{dict.gallery.resizeMode}</p>
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
                    <span>{dict.gallery.keepOriginal}</span>
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
                    <span>{dict.gallery.resizeTo}</span>
                  </label>
                </div>
              </div>

              {resizeMode === "resize" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">{dict.gallery.width}</span>
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
                    <span className="text-sm font-medium text-stone-700">
                      {dict.gallery.height}
                    </span>
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
                onClick={uploadImages}
                type="button"
              >
                {busy === "uploading" ? dict.gallery.uploading : dict.gallery.upload}
              </button>
            </div>
          </div>
        </section>

        {images && images.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">
            {dict.gallery.empty}
          </p>
        ) : null}

        {images && images.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {images.map((image) => (
              <article
                key={image.id}
                className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm"
              >
                <div className="relative">
                  <button
                    className="block w-full"
                    onClick={() => {
                      setSelectedImageIndex(images.findIndex((item) => item.id === image.id));
                    }}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={image.original_filename ?? dict.gallery.imageAlt}
                      className="h-56 w-full bg-stone-200 object-cover"
                      loading="lazy"
                      src={image.thumbnail_url}
                    />
                  </button>

                  <div className="absolute inset-x-3 top-3 flex items-start justify-between">
                    <button
                      className="rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-white disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={() => {
                        void rotateImage(image);
                      }}
                      type="button"
                    >
                      {dict.gallery.rotate}
                    </button>
                    <button
                      className="rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-white disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={() => {
                        void removeImage(image);
                      }}
                      type="button"
                    >
                      {dict.gallery.delete}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  <div>
                    <p className="truncate text-sm font-medium text-stone-900">
                      {image.original_filename ?? dict.gallery.imageAlt}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {image.width} x {image.height} ·{" "}
                      {new Date(image.created_at).toLocaleString(getDateLocale(locale))}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      <ImageLightbox
        items={(images ?? []).map((image) => ({
          imageUrl: image.image_url,
          alt: image.original_filename ?? dict.gallery.imageAlt,
          label: image.original_filename,
        }))}
        onClose={() => {
          setSelectedImageIndex(null);
        }}
        onSelect={setSelectedImageIndex}
        selectedIndex={selectedImageIndex}
      />
    </>
  );
}
