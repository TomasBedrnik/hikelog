"use client";

import { PartialBlock } from "@blocknote/core";
import Image from "next/image";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import {
  deleteGlobalHeroImage,
  getGlobalContent,
  GlobalContentRead,
  rotateGlobalHeroImage,
  updateGlobalContent,
  uploadGlobalHeroImage,
} from "@/lib/global-content";
import { getTripContentBlocks } from "@/lib/blocknote";
import { ImageLightbox } from "@/components/image-lightbox";
import { useI18n } from "@/components/i18n-provider";
import { TripContentEditor } from "@/components/trip-content-editor";

const DEFAULT_LONG_SIDE = "1920";
const DEFAULT_ACTIVITY_PHOTO_RESIZE_LONG_SIDE = "1920";
const DEFAULT_AUDIO_TRANSCRIPTION_MODEL = "latest_long";
const EMPTY_BLOCKS: PartialBlock[] = [{ type: "paragraph" }];

function toUpdatePayload(
  headline: string,
  blocks: PartialBlock[],
  activityPhotoResizeLongSide: number,
  audioTranscriptionLanguageCode: string,
  audioTranscriptionModel: string,
  audioTranscriptionEnableAutomaticPunctuation: boolean,
  audioTranscriptionProfanityFilter: boolean,
) {
  return {
    main_headline: headline.trim() || null,
    home_content: {
      type: "blocknote",
      blocks,
    },
    activity_photo_resize_long_side: activityPhotoResizeLongSide,
    activity_audio_transcription_language_code: audioTranscriptionLanguageCode.trim() || null,
    activity_audio_transcription_model:
      audioTranscriptionModel.trim() || DEFAULT_AUDIO_TRANSCRIPTION_MODEL,
    activity_audio_transcription_enable_automatic_punctuation:
      audioTranscriptionEnableAutomaticPunctuation,
    activity_audio_transcription_profanity_filter: audioTranscriptionProfanityFilter,
  };
}

export function AdminGlobalContentPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const [content, setContent] = useState<GlobalContentRead | null>(null);
  const [headline, setHeadline] = useState("");
  const [contentBlocks, setContentBlocks] = useState<PartialBlock[]>(EMPTY_BLOCKS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"saving" | "uploading" | "deleting" | "rotating" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [resizeMode, setResizeMode] = useState<"keep" | "resize">("resize");
  const [resizeLongSide, setResizeLongSide] = useState(DEFAULT_LONG_SIDE);
  const [activityPhotoResizeLongSide, setActivityPhotoResizeLongSide] = useState(
    DEFAULT_ACTIVITY_PHOTO_RESIZE_LONG_SIDE,
  );
  const [audioTranscriptionLanguageCode, setAudioTranscriptionLanguageCode] = useState("");
  const [audioTranscriptionModel, setAudioTranscriptionModel] = useState(
    DEFAULT_AUDIO_TRANSCRIPTION_MODEL,
  );
  const [
    audioTranscriptionEnableAutomaticPunctuation,
    setAudioTranscriptionEnableAutomaticPunctuation,
  ] = useState(true);
  const [audioTranscriptionProfanityFilter, setAudioTranscriptionProfanityFilter] =
    useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    const token = getIdToken();
    if (!token) {
      router.push("/login");
      return;
    }

    getGlobalContent(token)
      .then((loaded) => {
        setContent(loaded);
        setHeadline(loaded.main_headline ?? "");
        setContentBlocks(getTripContentBlocks(loaded.home_content));
        setActivityPhotoResizeLongSide(String(loaded.activity_photo_resize_long_side));
        setAudioTranscriptionLanguageCode(
          loaded.activity_audio_transcription_language_code ?? "",
        );
        setAudioTranscriptionModel(
          loaded.activity_audio_transcription_model || DEFAULT_AUDIO_TRANSCRIPTION_MODEL,
        );
        setAudioTranscriptionEnableAutomaticPunctuation(
          loaded.activity_audio_transcription_enable_automatic_punctuation,
        );
        setAudioTranscriptionProfanityFilter(
          loaded.activity_audio_transcription_profanity_filter,
        );
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

  const saveContent = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    const parsedActivityPhotoResizeLongSide = Number(activityPhotoResizeLongSide);
    if (
      !Number.isInteger(parsedActivityPhotoResizeLongSide) ||
      parsedActivityPhotoResizeLongSide <= 0
    ) {
      setError(dict.globalContent.activityPhotoResizeInvalid);
      return;
    }

    setBusy("saving");
    setError(null);
    try {
      const updated = await updateGlobalContent(
        token,
        toUpdatePayload(
          headline,
          contentBlocks,
          parsedActivityPhotoResizeLongSide,
          audioTranscriptionLanguageCode,
          audioTranscriptionModel,
          audioTranscriptionEnableAutomaticPunctuation,
          audioTranscriptionProfanityFilter,
        ),
      );
      startTransition(() => {
        setContent(updated);
        setActivityPhotoResizeLongSide(String(updated.activity_photo_resize_long_side));
        setAudioTranscriptionLanguageCode(
          updated.activity_audio_transcription_language_code ?? "",
        );
        setAudioTranscriptionModel(
          updated.activity_audio_transcription_model || DEFAULT_AUDIO_TRANSCRIPTION_MODEL,
        );
        setAudioTranscriptionEnableAutomaticPunctuation(
          updated.activity_audio_transcription_enable_automatic_punctuation,
        );
        setAudioTranscriptionProfanityFilter(
          updated.activity_audio_transcription_profanity_filter,
        );
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

  const uploadImage = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    if (!file) {
      setError(dict.globalContent.imageRequired);
      return;
    }

    let width: number | null = null;
    let height: number | null = null;
    if (resizeMode === "resize") {
      const longSide = Number(resizeLongSide);
      if (!Number.isInteger(longSide) || longSide <= 0) {
        setError(dict.globalContent.resizeLongSideInvalid);
        return;
      }
      width = longSide;
      height = longSide;
    }

    setBusy("uploading");
    setError(null);
    try {
      const updated = await uploadGlobalHeroImage(token, {
        file,
        resizeMode,
        resizeWidth: width,
        resizeHeight: height,
      });
      startTransition(() => {
        setContent(updated);
      });
      setFile(null);
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

  const removeImage = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy("deleting");
    setError(null);
    try {
      const updated = await deleteGlobalHeroImage(token);
      startTransition(() => {
        setContent(updated);
        setLightboxOpen(false);
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

  const rotateImage = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy("rotating");
    setError(null);
    try {
      const updated = await rotateGlobalHeroImage(token);
      startTransition(() => {
        setContent(updated);
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
    <>
      <div className="mx-auto mt-6 max-w-6xl border-t border-stone-300 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">{dict.globalContent.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-600">{dict.globalContent.description}</p>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
        {!content && !error ? (
          <p className="mt-4 text-sm text-stone-600">{dict.common.loading}</p>
        ) : null}

        <section className="mt-6 border-t border-stone-200 pt-6">
          <h2 className="text-lg font-semibold text-stone-900">{dict.globalContent.textSection}</h2>
          <div className="mt-5 grid gap-5">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">
                {dict.globalContent.mainHeadline}
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600"
                onChange={(event) => {
                  setHeadline(event.target.value);
                }}
                placeholder={dict.publicSite.homeTitle}
                value={headline}
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-medium text-stone-700">
                {dict.globalContent.homeText}
              </p>
              <TripContentEditor
                editorKey={content ? `global-${content.updated_at}` : "global-empty"}
                initialBlocks={contentBlocks}
                onChangeAction={setContentBlocks}
              />
            </div>

            <div>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">
                  {dict.globalContent.activityPhotoResizeLongSide}
                </span>
                <input
                  className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600"
                  inputMode="numeric"
                  onChange={(event) => {
                    setActivityPhotoResizeLongSide(event.target.value);
                  }}
                  value={activityPhotoResizeLongSide}
                />
                <p className="mt-2 text-xs text-stone-500">
                  {dict.globalContent.activityPhotoResizeLongSideHelp}
                </p>
              </label>
            </div>

            <div>
              <button
                className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy !== null}
                onClick={saveContent}
                type="button"
              >
                {busy === "saving" ? dict.globalContent.saving : dict.globalContent.save}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 border-t border-stone-200 pt-6">
          <h2 className="text-lg font-semibold text-stone-900">
            {dict.globalContent.audioTranscriptionSection}
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            {dict.globalContent.audioTranscriptionDescription}
          </p>

          <div className="mt-5 grid gap-5 rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-5">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">
                {dict.globalContent.audioTranscriptionLanguageCode}
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600"
                onChange={(event) => {
                  setAudioTranscriptionLanguageCode(event.target.value);
                }}
                placeholder={dict.globalContent.audioTranscriptionLanguageCodePlaceholder}
                value={audioTranscriptionLanguageCode}
              />
              <p className="mt-2 text-xs text-stone-500">
                {dict.globalContent.audioTranscriptionLanguageCodeHelp}
              </p>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">
                {dict.globalContent.audioTranscriptionModel}
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600"
                onChange={(event) => {
                  setAudioTranscriptionModel(event.target.value);
                }}
                placeholder={dict.globalContent.audioTranscriptionModelPlaceholder}
                value={audioTranscriptionModel}
              />
              <p className="mt-2 text-xs text-stone-500">
                {dict.globalContent.audioTranscriptionModelHelp}
              </p>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <input
                  checked={audioTranscriptionEnableAutomaticPunctuation}
                  className="mt-0.5 size-4 accent-emerald-700"
                  onChange={(event) => {
                    setAudioTranscriptionEnableAutomaticPunctuation(event.target.checked);
                  }}
                  type="checkbox"
                />
                <span>
                  <span className="block font-medium text-stone-900">
                    {dict.globalContent.audioTranscriptionAutomaticPunctuation}
                  </span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {dict.globalContent.audioTranscriptionAutomaticPunctuationHelp}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <input
                  checked={audioTranscriptionProfanityFilter}
                  className="mt-0.5 size-4 accent-emerald-700"
                  onChange={(event) => {
                    setAudioTranscriptionProfanityFilter(event.target.checked);
                  }}
                  type="checkbox"
                />
                <span>
                  <span className="block font-medium text-stone-900">
                    {dict.globalContent.audioTranscriptionProfanityFilter}
                  </span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {dict.globalContent.audioTranscriptionProfanityFilterHelp}
                  </span>
                </span>
              </label>
            </div>

            <div>
              <button
                className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy !== null}
                onClick={saveContent}
                type="button"
              >
                {busy === "saving" ? dict.globalContent.saving : dict.globalContent.save}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 border-t border-stone-200 pt-6">
          <h2 className="text-lg font-semibold text-stone-900">
            {dict.globalContent.imageSection}
          </h2>
          <p className="mt-2 text-sm text-stone-500">{dict.globalContent.imageDescription}</p>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">
                {dict.globalContent.imageFile}
              </span>
              <input
                key={inputKey}
                accept="image/jpeg,image/png"
                className="mt-2 block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                }}
                type="file"
              />
              <p className="mt-2 text-xs text-stone-500">{dict.globalContent.imageHelp}</p>
            </label>

            <div className="space-y-4 border-t border-stone-200 pt-4">
              <div>
                <p className="text-sm font-medium text-stone-700">
                  {dict.globalContent.resizeMode}
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
                    <span>{dict.globalContent.keepOriginal}</span>
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
                    <span>{dict.globalContent.resizeTo}</span>
                  </label>
                </div>
              </div>

              {resizeMode === "resize" ? (
                <div className="grid gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">
                      {dict.globalContent.longSide}
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
                  onClick={uploadImage}
                  type="button"
                >
                  {busy === "uploading" ? dict.globalContent.uploading : dict.globalContent.upload}
                </button>
                {content?.hero_image_url ? (
                  <>
                    <button
                      className="rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={rotateImage}
                      type="button"
                    >
                      {busy === "rotating" ? dict.globalContent.rotating : dict.gallery.rotate}
                    </button>
                    <button
                      className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={removeImage}
                      type="button"
                    >
                      {busy === "deleting" ? dict.globalContent.deleting : dict.gallery.delete}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {content?.hero_image_url ? (
            <div className="mt-6">
              <button
                className="group block overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm"
                onClick={() => {
                  setLightboxOpen(true);
                }}
                type="button"
              >
                <Image
                  alt={content.hero_original_filename ?? dict.globalContent.imageAlt}
                  className="h-72 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  height={720}
                  src={content.hero_thumbnail_url ?? content.hero_image_url}
                  width={1280}
                />
              </button>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-white px-4 py-4 text-sm text-stone-500">
              {dict.globalContent.imageEmpty}
            </p>
          )}
        </section>
      </div>

      {content?.hero_image_url ? (
        <ImageLightbox
          items={[
            {
              imageUrl: content.hero_image_url,
              alt: content.hero_original_filename ?? dict.globalContent.imageAlt,
            },
          ]}
          onClose={() => {
            setLightboxOpen(false);
          }}
          onSelect={() => {}}
          selectedIndex={lightboxOpen ? 0 : null}
        />
      ) : null}
    </>
  );
}
