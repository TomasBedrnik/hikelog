"use client";

import { PartialBlock } from "@blocknote/core";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import { ActivityPhotoManager } from "@/components/activity-photo-manager";
import { CommentsSection } from "@/components/comments-section";
import { TripContentEditor } from "@/components/trip-content-editor";
import { useI18n } from "@/components/i18n-provider";
import {
  ActivityPhotoRead,
  ActivityRead,
  ActivityWrite,
  createActivity,
  deleteActivity,
  deleteActivityComment,
  listActivities,
  sortActivitiesByStartDate,
  updateActivity,
  uploadActivityGpx,
} from "@/lib/activities";
import { getTripContentBlocks } from "@/lib/blocknote";
import { formatMessage, getDateLocale } from "@/lib/i18n";
import { listTrips, TripRead } from "@/lib/trips";

const EMPTY_BLOCKS: PartialBlock[] = [{ type: "paragraph" }];

type ActivityDraft = {
  id: number | null;
  tripId: number | null;
  stravaActivityId: string;
  userId: string;
  uploadId: string;
  externalId: string;
  type: string;
  sportType: string;
  startDate: string;
  name: string;
  distance: string;
  movingTime: string;
  elapsedTime: string;
  totalElevationGain: string;
  descriptionBlocks: PartialBlock[];
  polyline: string;
  summaryPolyline: string;
  createdAt: string | null;
};

function toDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return formatter.format(date).replace(" ", "T");
}

function toActivityDraft(activity: ActivityRead): ActivityDraft {
  return {
    id: activity.id,
    tripId: activity.trip_id,
    stravaActivityId: activity.strava_activity_id?.toString() ?? "",
    userId: activity.user_id?.toString() ?? "",
    uploadId: activity.upload_id?.toString() ?? "",
    externalId: activity.external_id ?? "",
    type: activity.type ?? "",
    sportType: activity.sport_type ?? "",
    startDate: toDateTimeInput(activity.start_date),
    name: activity.name,
    distance: activity.distance?.toString() ?? "",
    movingTime: activity.moving_time?.toString() ?? "",
    elapsedTime: activity.elapsed_time?.toString() ?? "",
    totalElevationGain: activity.total_elevation_gain?.toString() ?? "",
    descriptionBlocks: getTripContentBlocks(activity.description),
    polyline: activity.polyline ?? "",
    summaryPolyline: activity.summary_polyline ?? "",
    createdAt: activity.created_at,
  };
}

function createEmptyActivityDraft(tripId: number | null): ActivityDraft {
  return {
    id: null,
    tripId,
    stravaActivityId: "",
    userId: "",
    uploadId: "",
    externalId: "",
    type: "",
    sportType: "",
    startDate: "",
    name: "",
    distance: "",
    movingTime: "",
    elapsedTime: "",
    totalElevationGain: "",
    descriptionBlocks: EMPTY_BLOCKS,
    polyline: "",
    summaryPolyline: "",
    createdAt: null,
  };
}

export function AdminActivitiesPage() {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const [trips, setTrips] = useState<TripRead[] | null>(null);
  const [activities, setActivities] = useState<ActivityRead[] | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | "new" | null>(null);
  const [activityDraft, setActivityDraft] = useState<ActivityDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"saving" | "deleting" | "uploading-gpx" | null>(null);
  const [activityGpxFile, setActivityGpxFile] = useState<File | null>(null);
  const [activityGpxInputKey, setActivityGpxInputKey] = useState(0);

  const resetActivityGpxSelection = () => {
    setActivityGpxFile(null);
    setActivityGpxInputKey((current) => current + 1);
  };

  const getActivitiesForTrip = (tripId: number) =>
    sortActivitiesByStartDate((activities ?? []).filter((activity) => activity.trip_id === tripId));

  const setCurrentActivity = (activity: ActivityRead) => {
    setSelectedActivityId(activity.id);
    setActivityDraft(toActivityDraft(activity));
    resetActivityGpxSelection();
  };

  const showNewActivityForTrip = (tripId: number | null) => {
    setSelectedActivityId("new");
    setActivityDraft(createEmptyActivityDraft(tripId));
    resetActivityGpxSelection();
  };

  useEffect(() => {
    const token = getIdToken();
    if (!token) {
      router.push("/login");
      return;
    }

    Promise.all([listTrips(token), listActivities(token)])
      .then(([tripItems, activityItems]) => {
        setTrips(tripItems);
        setActivities(activityItems);

        if (tripItems.length === 0) {
          setSelectedTripId(null);
          setSelectedActivityId(null);
          setActivityDraft(null);
          return;
        }

        const firstTrip = tripItems[0];
        const firstTripActivities = sortActivitiesByStartDate(
          activityItems.filter((activity) => activity.trip_id === firstTrip.id),
        );

        setSelectedTripId(firstTrip.id);
        if (firstTripActivities.length > 0) {
          setCurrentActivity(firstTripActivities[0]);
        } else {
          showNewActivityForTrip(firstTrip.id);
        }
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

  const selectedTrip =
    selectedTripId !== null
      ? ((trips ?? []).find((trip) => trip.id === selectedTripId) ?? null)
      : null;
  const visibleActivities = selectedTripId !== null ? getActivitiesForTrip(selectedTripId) : [];
  const selectedActivity =
    activityDraft && activityDraft.id !== null
      ? (visibleActivities.find((activity) => activity.id === activityDraft.id) ?? null)
      : null;

  const selectTrip = (tripId: number) => {
    setError(null);
    setSelectedTripId(tripId);
    const tripActivities = getActivitiesForTrip(tripId);
    if (tripActivities.length > 0) {
      setCurrentActivity(tripActivities[0]);
    } else {
      showNewActivityForTrip(tripId);
    }
  };

  const replaceActivity = (saved: ActivityRead) => {
    setActivities((current) =>
      (current ?? []).map((activity) => (activity.id === saved.id ? saved : activity)),
    );
    setActivityDraft((current) => (current?.id === saved.id ? toActivityDraft(saved) : current));
  };

  const replaceActivityPhotos = (activityId: number, photos: ActivityPhotoRead[]) => {
    setActivities((current) =>
      (current ?? []).map((activity) =>
        activity.id === activityId ? { ...activity, photos } : activity,
      ),
    );
  };

  const startNewActivity = () => {
    setError(null);
    showNewActivityForTrip(selectedTripId);
  };

  const uploadCurrentActivityGpx = async () => {
    const token = getIdToken();
    if (!token) {
      router.push("/login");
      return;
    }

    if (!activityDraft?.id) {
      setError(dict.activities.saveActivityFirstForGpx);
      return;
    }

    if (!activityGpxFile) {
      setError(dict.activities.gpxRequired);
      return;
    }

    setBusy("uploading-gpx");
    setError(null);

    try {
      const saved = await uploadActivityGpx(token, activityDraft.id, activityGpxFile);
      startTransition(() => {
        setActivities((current) =>
          (current ?? []).map((activity) => (activity.id === saved.id ? saved : activity)),
        );
        setCurrentActivity(saved);
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

  const persistActivity = async () => {
    const token = getIdToken();
    if (!token || !activityDraft || !selectedTripId) {
      return;
    }

    if (!activityDraft.name.trim()) {
      setError(dict.activities.nameRequired);
      return;
    }

    const payload: ActivityWrite = {
      trip_id: selectedTripId,
      strava_activity_id: activityDraft.stravaActivityId
        ? Number(activityDraft.stravaActivityId)
        : null,
      user_id: activityDraft.userId ? Number(activityDraft.userId) : null,
      upload_id: activityDraft.uploadId ? Number(activityDraft.uploadId) : null,
      external_id: activityDraft.externalId.trim() || null,
      type: activityDraft.type.trim() || null,
      sport_type: activityDraft.sportType.trim() || null,
      start_date: activityDraft.startDate ? new Date(activityDraft.startDate).toISOString() : null,
      name: activityDraft.name.trim(),
      distance: activityDraft.distance ? Number(activityDraft.distance) : null,
      moving_time: activityDraft.movingTime ? Number(activityDraft.movingTime) : null,
      elapsed_time: activityDraft.elapsedTime ? Number(activityDraft.elapsedTime) : null,
      total_elevation_gain: activityDraft.totalElevationGain
        ? Number(activityDraft.totalElevationGain)
        : null,
      description: {
        type: "blocknote",
        blocks: activityDraft.descriptionBlocks,
      },
      polyline: activityDraft.polyline.trim() || null,
      summary_polyline: activityDraft.summaryPolyline.trim() || null,
    };

    if (
      [
        payload.distance,
        payload.moving_time,
        payload.elapsed_time,
        payload.total_elevation_gain,
      ].some((value) => value !== null && (!Number.isFinite(value) || value < 0))
    ) {
      setError(dict.activities.invalidNumber);
      return;
    }

    setBusy("saving");
    setError(null);

    try {
      const saved =
        activityDraft.id === null
          ? await createActivity(token, payload)
          : await updateActivity(token, activityDraft.id, payload);

      startTransition(() => {
        setActivities((current) => {
          const items = current ?? [];
          return activityDraft.id === null
            ? [saved, ...items]
            : items.map((activity) => (activity.id === saved.id ? saved : activity));
        });
        setSelectedActivityId(saved.id);
        setActivityDraft(toActivityDraft(saved));
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

  const removeCurrentActivity = async () => {
    const token = getIdToken();
    if (!token || !activityDraft?.id || !selectedTripId) {
      return;
    }

    if (
      !window.confirm(formatMessage(dict.activities.deleteConfirm, { name: activityDraft.name }))
    ) {
      return;
    }

    setBusy("deleting");
    setError(null);

    try {
      await deleteActivity(token, activityDraft.id);
      startTransition(() => {
        const nextItems = visibleActivities.filter((activity) => activity.id !== activityDraft.id);
        setActivities((current) =>
          (current ?? []).filter((activity) => activity.id !== activityDraft.id),
        );
        if (nextItems.length > 0) {
          setCurrentActivity(nextItems[0]);
        } else {
          showNewActivityForTrip(selectedTripId);
        }
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

  const deleteCurrentActivityComment = async (commentId: number) => {
    const token = getIdToken();
    if (!token || !selectedActivity) {
      return;
    }

    try {
      await deleteActivityComment(token, selectedActivity.id, commentId);
      replaceActivity({
        ...selectedActivity,
        comments: selectedActivity.comments.filter((comment) => comment.id !== commentId),
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "AUTH_REQUIRED") {
        clearIdToken();
        router.push("/login");
        return;
      }
      throw e;
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-7xl">
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {!trips && !error ? (
        <p className="text-sm text-stone-600">{dict.activities.loading}</p>
      ) : null}

      <div className="mt-6 border-t border-stone-300 pt-6">
        <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{dict.activities.title}</h1>
            <p className="mt-2 text-sm text-stone-600">{dict.adminHome.activitiesDescription}</p>
          </div>

          {selectedTripId !== null ? (
            <button
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              onClick={startNewActivity}
              type="button"
            >
              {dict.activities.create}
            </button>
          ) : null}
        </div>

        {trips && trips.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">
            {dict.activities.noTrips}
          </p>
        ) : null}

        {trips && trips.length > 0 ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <section className="border-t border-stone-200 pt-4">
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">{dict.activities.trip}</span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-600"
                    onChange={(event) => {
                      selectTrip(Number(event.target.value));
                    }}
                    value={selectedTripId ?? ""}
                  >
                    {(trips ?? []).map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="border-t border-stone-200 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                    {dict.activities.publicTitle}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-stone-600">
                    {visibleActivities.length}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selectedActivityId === "new"
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-dashed border-stone-300 bg-white hover:border-stone-400"
                    }`}
                    onClick={startNewActivity}
                    type="button"
                  >
                    <div className="text-sm font-medium">{dict.activities.newActivity}</div>
                    <div className="mt-1 text-xs text-stone-500">{dict.activities.createNew}</div>
                  </button>

                  {visibleActivities.length === 0 ? (
                    <p className="rounded-2xl bg-white px-4 py-4 text-sm text-stone-500">
                      {dict.activities.emptyPublic}
                    </p>
                  ) : (
                    visibleActivities.map((activity) => (
                      <button
                        key={activity.id}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          selectedActivityId === activity.id
                            ? "border-emerald-600 bg-emerald-50"
                            : "border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50"
                        }`}
                        onClick={() => {
                          setError(null);
                          setCurrentActivity(activity);
                        }}
                        type="button"
                      >
                        <div className="truncate text-sm font-medium">{activity.name}</div>
                        <div className="mt-1 text-xs text-stone-500">
                          {activity.sport_type ?? activity.type ?? "—"}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </aside>

            <div>
              {!selectedTrip ? (
                <p className="rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">
                  {dict.activities.tripRequired}
                </p>
              ) : !activityDraft ? (
                <p className="rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">
                  {dict.activities.selectPrompt}
                </p>
              ) : (
                <div className="space-y-5 border-t border-stone-200 pt-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        {dict.activities.name}
                      </label>
                      <input
                        className="mt-2 w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight outline-none placeholder:text-stone-300"
                        onChange={(event) => {
                          const value = event.target.value;
                          setActivityDraft((current) =>
                            current ? { ...current, name: value } : current,
                          );
                        }}
                        placeholder={dict.activities.namePlaceholder}
                        value={activityDraft.name}
                      />
                      <p className="mt-2 text-xs text-stone-500">
                        {activityDraft.createdAt
                          ? `${dict.activities.created} ${new Date(activityDraft.createdAt).toLocaleString(getDateLocale(locale))}`
                          : dict.activities.notSavedYet}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {activityDraft.id !== null ? (
                        <button
                          className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={busy !== null}
                          onClick={removeCurrentActivity}
                          type="button"
                        >
                          {busy === "deleting" ? dict.activities.deleting : dict.activities.delete}
                        </button>
                      ) : null}
                      <button
                        className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={persistActivity}
                        type="button"
                      >
                        {busy === "saving"
                          ? dict.activities.saving
                          : activityDraft.id === null
                            ? dict.activities.create
                            : dict.activities.save}
                      </button>
                    </div>
                  </div>

                  <TripContentEditor
                    editorKey={
                      activityDraft.id === null
                        ? `new-${selectedTrip.id}`
                        : `activity-${activityDraft.id}`
                    }
                    initialBlocks={activityDraft.descriptionBlocks}
                    onChangeAction={(descriptionBlocks) => {
                      setActivityDraft((current) =>
                        current ? { ...current, descriptionBlocks } : current,
                      );
                    }}
                  />

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["stravaActivityId", dict.activities.stravaActivityId],
                      ["userId", dict.activities.userId],
                      ["uploadId", dict.activities.uploadId],
                      ["externalId", dict.activities.externalId],
                    ].map(([field, label]) => (
                      <label key={field} className="block">
                        <span className="text-sm font-medium text-stone-700">{label}</span>
                        <input
                          className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                          onChange={(event) => {
                            const value = event.target.value;
                            setActivityDraft((current) =>
                              current ? { ...current, [field]: value } : current,
                            );
                          }}
                          value={activityDraft[field as keyof ActivityDraft] as string}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">
                        {dict.activities.startDate}
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        onChange={(event) => {
                          setActivityDraft((current) =>
                            current ? { ...current, startDate: event.target.value } : current,
                          );
                        }}
                        type="datetime-local"
                        value={activityDraft.startDate}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">
                        {dict.activities.type}
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        onChange={(event) => {
                          setActivityDraft((current) =>
                            current ? { ...current, type: event.target.value } : current,
                          );
                        }}
                        value={activityDraft.type}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">
                        {dict.activities.sportType}
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        onChange={(event) => {
                          setActivityDraft((current) =>
                            current ? { ...current, sportType: event.target.value } : current,
                          );
                        }}
                        value={activityDraft.sportType}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">
                        {dict.activities.distance}
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        inputMode="decimal"
                        onChange={(event) => {
                          setActivityDraft((current) =>
                            current ? { ...current, distance: event.target.value } : current,
                          );
                        }}
                        value={activityDraft.distance}
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 md:grid-cols-3">
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">
                        {dict.activities.movingTime}
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        inputMode="numeric"
                        onChange={(event) => {
                          setActivityDraft((current) =>
                            current ? { ...current, movingTime: event.target.value } : current,
                          );
                        }}
                        value={activityDraft.movingTime}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">
                        {dict.activities.elapsedTime}
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        inputMode="numeric"
                        onChange={(event) => {
                          setActivityDraft((current) =>
                            current ? { ...current, elapsedTime: event.target.value } : current,
                          );
                        }}
                        value={activityDraft.elapsedTime}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">
                        {dict.activities.totalElevationGain}
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        inputMode="decimal"
                        onChange={(event) => {
                          setActivityDraft((current) =>
                            current
                              ? { ...current, totalElevationGain: event.target.value }
                              : current,
                          );
                        }}
                        value={activityDraft.totalElevationGain}
                      />
                    </label>
                  </div>

                  <div className="space-y-5">
                    <div className="border-t border-stone-200 pt-4">
                      <p className="text-sm font-medium text-stone-700">
                        {dict.activities.gpxFile}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">{dict.activities.gpxHelp}</p>
                      <input
                        key={activityGpxInputKey}
                        accept=".gpx,application/gpx+xml"
                        className="mt-3 block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm"
                        onChange={(event) => {
                          setActivityGpxFile(event.target.files?.[0] ?? null);
                        }}
                        type="file"
                      />
                      <button
                        className="mt-3 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() => {
                          void uploadCurrentActivityGpx();
                        }}
                        type="button"
                      >
                        {busy === "uploading-gpx"
                          ? dict.activities.gpxUploading
                          : dict.activities.gpxUpload}
                      </button>
                    </div>

                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">
                        {dict.activities.polyline}
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        onChange={(event) => {
                          setActivityDraft((current) =>
                            current ? { ...current, polyline: event.target.value } : current,
                          );
                        }}
                        value={activityDraft.polyline}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">
                        {dict.activities.summaryPolyline}
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        onChange={(event) => {
                          setActivityDraft((current) =>
                            current ? { ...current, summaryPolyline: event.target.value } : current,
                          );
                        }}
                        value={activityDraft.summaryPolyline}
                      />
                    </label>
                  </div>

                  <ActivityPhotoManager
                    activity={selectedActivity}
                    onPhotosChange={(photos) => {
                      if (!selectedActivity) {
                        return;
                      }
                      replaceActivityPhotos(selectedActivity.id, photos);
                    }}
                  />

                  {selectedActivity ? (
                    <CommentsSection
                      comments={selectedActivity.comments}
                      deletingLabel={dict.comments.deleting}
                      deleteLabel={dict.comments.delete}
                      emptyText={dict.comments.emptyActivity}
                      locale={locale}
                      nameLabel={dict.comments.name}
                      onDelete={deleteCurrentActivityComment}
                      textLabel={dict.comments.text}
                      title={dict.comments.activityTitle}
                      unknownError={dict.common.unknownError}
                    />
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
