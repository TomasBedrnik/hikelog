"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import {
  ActivityAudioRead,
  ActivityRead,
  deleteActivityAudio,
  uploadActivityAudios,
} from "@/lib/activities";
import { useI18n } from "@/components/i18n-provider";
import { getDateLocale } from "@/lib/i18n";

export function ActivityAudioManager({
  activity,
  onAudiosChange,
}: {
  activity: ActivityRead | null;
  onAudiosChange: (audios: ActivityAudioRead[]) => void;
}) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"uploading" | `delete-${number}` | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);

  const audios = useMemo(
    () =>
      [...(activity?.audios ?? [])].sort((a, b) => {
        const left = new Date(a.created_at).getTime();
        const right = new Date(b.created_at).getTime();
        if (left !== right) {
          return right - left;
        }
        return b.id - a.id;
      }),
    [activity?.audios],
  );

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
      setError(dict.activityAudios.saveActivityFirst);
      return;
    }

    const token = requireToken();
    if (!token) {
      return;
    }

    if (files.length === 0) {
      setError(dict.activityAudios.filesRequired);
      return;
    }

    setBusy("uploading");
    setError(null);
    try {
      let nextAudios = audios;
      const { uploaded, failures } = await uploadActivityAudios(token, activity.id, files, {
        onUploaded: (saved) => {
          nextAudios = [...saved, ...nextAudios];
          startTransition(() => {
            onAudiosChange(nextAudios);
          });
        },
      });

      setFiles([]);
      setInputKey((current) => current + 1);

      if (failures.length > 0) {
        setError(
          [
            dict.activityAudios.uploadPartialFailure,
            ...failures.map(
              ({ fileName, message }) =>
                `${dict.activityAudios.uploadFailedAudio.replace("{name}", fileName)}: ${message}`,
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
    }
  };

  const handleDelete = async (audio: ActivityAudioRead) => {
    if (!activity?.id) {
      return;
    }

    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy(`delete-${audio.id}`);
    setError(null);
    try {
      await deleteActivityAudio(token, activity.id, audio.id);
      startTransition(() => {
        onAudiosChange(audios.filter((item) => item.id !== audio.id));
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
        <h3 className="text-lg font-semibold text-stone-900">{dict.activityAudios.title}</h3>
        <p className="text-sm text-stone-500">{dict.activityAudios.description}</p>
      </div>

      {error ? (
        <p className="mt-4 whitespace-pre-line rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!activity?.id ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm text-stone-500">
          {dict.activityAudios.saveActivityFirst}
        </p>
      ) : (
        <>
          <div className="mt-5 rounded-[1.5rem] border border-stone-200 bg-white p-4">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">
                {dict.activityAudios.files}
              </span>
              <input
                key={inputKey}
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm"
                className="mt-2 block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm"
                multiple
                onChange={(event) => {
                  setFiles(Array.from(event.target.files ?? []));
                }}
                type="file"
              />
              <p className="mt-2 text-xs text-stone-500">{dict.activityAudios.filesHelp}</p>
            </label>

            <button
              className="mt-4 rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy !== null}
              onClick={() => {
                void handleUpload();
              }}
              type="button"
            >
              {busy === "uploading" ? dict.activityAudios.uploading : dict.activityAudios.upload}
            </button>
          </div>

          {audios.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm text-stone-500">
              {dict.activityAudios.empty}
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {audios.map((audio) => (
                <article
                  key={audio.id}
                  className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {audio.original_filename ?? dict.activityAudios.audioFallback}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {new Date(audio.created_at).toLocaleString(getDateLocale(locale))}
                      </p>
                      <audio className="mt-3 w-full" controls preload="none" src={audio.audio_url}>
                        {dict.activityAudios.playbackUnsupported}
                      </audio>
                    </div>

                    <button
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={() => {
                        void handleDelete(audio);
                      }}
                      type="button"
                    >
                      {busy === `delete-${audio.id}`
                        ? dict.activityAudios.deleting
                        : dict.activityAudios.delete}
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
