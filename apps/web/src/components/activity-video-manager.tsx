"use client";

import Image from "next/image";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import {
  ActivityRead,
  ActivityVideoRead,
  deleteActivityVideo,
  reorderActivityVideos,
  uploadActivityVideos,
} from "@/lib/activities";
import { getGlobalContent } from "@/lib/global-content";
import { useI18n } from "@/components/i18n-provider";
import { VideoLightbox } from "@/components/video-lightbox";

const DEFAULT_MAX_VIDEO_UPLOAD_SIZE_MB = 512;

export function ActivityVideoManager({
  activity,
  onVideosChange,
}: {
  activity: ActivityRead | null;
  onVideosChange: (videos: ActivityVideoRead[]) => void;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"uploading" | `delete-${number}` | `move-${number}` | null>(
    null,
  );
  const [files, setFiles] = useState<File[]>([]);
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(DEFAULT_MAX_VIDEO_UPLOAD_SIZE_MB);
  const [inputKey, setInputKey] = useState(0);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);

  const videos = useMemo(
    () => [...(activity?.videos ?? [])].sort((a, b) => a.position - b.position || a.id - b.id),
    [activity?.videos],
  );

  useEffect(() => {
    const token = getIdToken();
    if (!token) {
      return;
    }

    getGlobalContent(token)
      .then((loaded) => {
        setMaxUploadSizeMb(loaded.activity_video_max_upload_size_mb);
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
      setError(dict.activityVideos.saveActivityFirst);
      return;
    }

    const token = requireToken();
    if (!token) {
      return;
    }

    if (files.length === 0) {
      setError(dict.activityVideos.filesRequired);
      return;
    }

    const maxUploadSizeBytes = maxUploadSizeMb * 1024 * 1024;
    const oversizedFiles = files.filter((file) => file.size > maxUploadSizeBytes);
    if (oversizedFiles.length > 0) {
      setError(
        [
          dict.activityVideos.fileTooLarge.replace("{limit}", String(maxUploadSizeMb)),
          ...oversizedFiles.map((file) =>
            dict.activityVideos.uploadFailedVideo.replace("{name}", file.name),
          ),
        ].join("\n"),
      );
      return;
    }

    setBusy("uploading");
    setError(null);
    try {
      let nextVideos = videos;
      const { uploaded, failures } = await uploadActivityVideos(token, activity.id, files, {
        onUploaded: (saved) => {
          nextVideos = [...nextVideos, ...saved].sort(
            (a, b) => a.position - b.position || a.id - b.id,
          );
          startTransition(() => {
            onVideosChange(nextVideos);
          });
        },
      });

      setFiles([]);
      setInputKey((current) => current + 1);

      if (failures.length > 0) {
        setError(
          [
            dict.activityVideos.uploadPartialFailure,
            ...failures.map(
              ({ fileName, message }) =>
                `${dict.activityVideos.uploadFailedVideo.replace("{name}", fileName)}: ${message}`,
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

  const handleDelete = async (video: ActivityVideoRead) => {
    if (!activity?.id) {
      return;
    }

    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy(`delete-${video.id}`);
    setError(null);
    try {
      await deleteActivityVideo(token, activity.id, video.id);
      startTransition(() => {
        onVideosChange(videos.filter((item) => item.id !== video.id));
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

  const handleMove = async (videoId: number, direction: -1 | 1) => {
    if (!activity?.id) {
      return;
    }

    const token = requireToken();
    if (!token) {
      return;
    }

    const index = videos.findIndex((video) => video.id === videoId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= videos.length) {
      return;
    }

    const reordered = [...videos];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, item);

    setBusy(`move-${videoId}`);
    setError(null);
    try {
      const saved = await reorderActivityVideos(
        token,
        activity.id,
        reordered.map((video) => video.id),
      );
      startTransition(() => {
        onVideosChange(saved);
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
        <h3 className="text-lg font-semibold text-stone-900">{dict.activityVideos.title}</h3>
        <p className="text-sm text-stone-500">{dict.activityVideos.description}</p>
        <p className="text-sm text-stone-600">
          {dict.activityVideos.totalCount.replace("{count}", String(videos.length))}
        </p>
      </div>

      {error ? (
        <p className="mt-4 whitespace-pre-line rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!activity?.id ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm text-stone-500">
          {dict.activityVideos.saveActivityFirst}
        </p>
      ) : (
        <>
          <div className="mt-5 rounded-[1.5rem] border border-stone-200 bg-white p-4">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">
                {dict.activityVideos.files}
              </span>
              <input
                key={inputKey}
                accept="video/*,.mp4,.mov,.avi,.mpeg,.mpg,.m4v,.webm,.ogv,.3gp"
                className="mt-2 block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm"
                multiple
                onChange={(event) => {
                  setFiles(Array.from(event.target.files ?? []));
                }}
                type="file"
              />
              <p className="mt-2 text-xs text-stone-500">
                {dict.activityVideos.filesHelp.replace("{limit}", String(maxUploadSizeMb))}
              </p>
            </label>

            <button
              className="mt-4 rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy !== null}
              onClick={() => {
                void handleUpload();
              }}
              type="button"
            >
              {busy === "uploading" ? dict.activityVideos.uploading : dict.activityVideos.upload}
            </button>
          </div>

          {videos.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm text-stone-500">
              {dict.activityVideos.empty}
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {videos.map((video, index) => (
                <article
                  key={video.id}
                  className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm"
                >
                  <div className="relative">
                    <button
                      className="block w-full"
                      onClick={() => {
                        setSelectedVideoIndex(index);
                      }}
                      type="button"
                    >
                      {video.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={video.original_filename ?? dict.activityVideos.videoFallback}
                          className="h-56 w-full bg-stone-200 object-cover"
                          loading="lazy"
                          src={video.thumbnail_url}
                        />
                      ) : (
                        <div className="flex h-56 w-full items-center justify-center bg-stone-200 text-sm text-stone-500">
                          {dict.activityVideos.videoFallback}
                        </div>
                      )}
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-white/92 p-4 shadow-lg backdrop-blur-sm">
                          <Image
                            alt=""
                            aria-hidden="true"
                            height={28}
                            src="/icons/play-light.svg"
                            width={28}
                          />
                        </span>
                      </span>
                    </button>

                    <div className="absolute left-3 top-3 flex gap-2">
                      <button
                        aria-label={dict.activityVideos.moveEarlier}
                        className="rounded-full bg-white/92 px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-white disabled:opacity-50"
                        disabled={busy !== null || index === 0}
                        onClick={() => {
                          void handleMove(video.id, -1);
                        }}
                        type="button"
                      >
                        {dict.activityVideos.moveEarlierArrow}
                      </button>
                      <button
                        aria-label={dict.activityVideos.moveLater}
                        className="rounded-full bg-white/92 px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-white disabled:opacity-50"
                        disabled={busy !== null || index === videos.length - 1}
                        onClick={() => {
                          void handleMove(video.id, 1);
                        }}
                        type="button"
                      >
                        {dict.activityVideos.moveLaterArrow}
                      </button>
                    </div>

                    <div className="absolute bottom-3 right-3">
                      <button
                        aria-label={dict.activityVideos.delete}
                        className="rounded-full bg-red-600 p-2 text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() => {
                          void handleDelete(video);
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

      <VideoLightbox
        items={videos.map((video) => ({
          videoUrl: video.compressed_video_url ?? video.original_video_url,
          label: video.original_filename,
        }))}
        onClose={() => {
          setSelectedVideoIndex(null);
        }}
        onSelect={setSelectedVideoIndex}
        selectedIndex={selectedVideoIndex}
      />
    </section>
  );
}
