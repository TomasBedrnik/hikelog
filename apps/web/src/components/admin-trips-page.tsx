"use client";

import { PartialBlock } from "@blocknote/core";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { ActivityPhotoManager } from "@/components/activity-photo-manager";
import { TripImageManager } from "@/components/trip-image-manager";
import { useI18n } from "@/components/i18n-provider";
import { TripContentEditor } from "@/components/trip-content-editor";
import {
  ActivityPhotoRead,
  ActivityRead,
  ActivityWrite,
  createActivity,
  deleteActivity,
  listActivities,
  sortActivitiesByStartDate,
  updateActivity,
  uploadActivityGpx,
} from "@/lib/activities";
import { getTripContentBlocks } from "@/lib/blocknote";
import { formatMessage, getDateLocale } from "@/lib/i18n";
import { getCountryOptions, getTimezoneOptions } from "@/lib/options";
import { createTrip, deleteTrip, listTrips, TripImageRead, TripRead, TripWrite, updateTrip } from "@/lib/trips";

const EMPTY_BLOCKS: PartialBlock[] = [{ type: "paragraph" }];

type TripDraft = {
  id: number | null;
  name: string;
  contentBlocks: PartialBlock[];
  startDate: string;
  endDate: string;
  timezone: string;
  countryCodes: string[];
  plannedDistanceM: string;
  plannedPathPolyline: string;
  showPlannedPath: boolean;
  latitude: string;
  longitude: string;
  zoom: string;
  metricsConfigText: string;
  createdAt: string | null;
};

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

function formatJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

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

function toDraft(trip: TripRead): TripDraft {
  return {
    id: trip.id,
    name: trip.name,
    contentBlocks: getTripContentBlocks(trip.content),
    startDate: trip.start_date ?? "",
    endDate: trip.end_date ?? "",
    timezone: trip.timezone ?? "",
    countryCodes: trip.country_codes,
    plannedDistanceM: trip.planned_distance_m?.toString() ?? "",
    plannedPathPolyline: trip.planned_path_polyline ?? "",
    showPlannedPath: trip.show_planned_path,
    latitude: trip.latitude?.toString() ?? "",
    longitude: trip.longitude?.toString() ?? "",
    zoom: trip.zoom?.toString() ?? "",
    metricsConfigText: formatJson(trip.metrics_config),
    createdAt: trip.created_at,
  };
}

function createEmptyDraft(): TripDraft {
  return {
    id: null,
    name: "",
    contentBlocks: EMPTY_BLOCKS,
    startDate: "",
    endDate: "",
    timezone: "",
    countryCodes: [],
    plannedDistanceM: "",
    plannedPathPolyline: "",
    showPlannedPath: false,
    latitude: "",
    longitude: "",
    zoom: "",
    metricsConfigText: "{}",
    createdAt: null,
  };
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

function toPayload(draft: TripDraft): TripWrite {
  const metricsConfig = JSON.parse(draft.metricsConfigText) as Record<string, unknown>;

  return {
    name: draft.name.trim(),
    content: {
      type: "blocknote",
      blocks: draft.contentBlocks,
    },
    start_date: draft.startDate || null,
    end_date: draft.endDate || null,
    timezone: draft.timezone.trim() || null,
    country_codes: draft.countryCodes,
    planned_distance_m: draft.plannedDistanceM ? Number(draft.plannedDistanceM) : null,
    planned_path_polyline: draft.plannedPathPolyline.trim() || null,
    show_planned_path: draft.showPlannedPath,
    latitude: draft.latitude ? Number(draft.latitude) : null,
    longitude: draft.longitude ? Number(draft.longitude) : null,
    zoom: draft.zoom ? Number(draft.zoom) : null,
    metrics_config: metricsConfig,
  };
}

export function AdminTripsPage() {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const timezoneOptions = getTimezoneOptions();
  const countryOptions = getCountryOptions(locale);
  const timezoneSet = new Set(timezoneOptions);
  const [trips, setTrips] = useState<TripRead[] | null>(null);
  const [activities, setActivities] = useState<ActivityRead[] | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<TripDraft | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | "new" | null>(null);
  const [activityDraft, setActivityDraft] = useState<ActivityDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"saving" | "deleting" | null>(null);
  const [activityBusy, setActivityBusy] = useState<"saving" | "deleting" | "uploading-gpx" | null>(null);
  const [activityGpxFile, setActivityGpxFile] = useState<File | null>(null);
  const [activityGpxInputKey, setActivityGpxInputKey] = useState(0);
  const [countriesExpanded, setCountriesExpanded] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");

  const filteredCountryOptions = countryOptions.filter((country) =>
    country.label.toLowerCase().includes(countryQuery.trim().toLowerCase()),
  );

  const selectedCountriesLabel = draft?.countryCodes.length
    ? countryOptions
        .filter((country) => draft.countryCodes.includes(country.code))
        .map((country) => country.label)
        .join(", ")
    : dict.trips.countriesPlaceholder;

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
          setSelectedTripId("new");
          setDraft(createEmptyDraft());
          setSelectedActivityId("new");
          setActivityDraft(createEmptyActivityDraft(null));
          return;
        }

        const firstTrip = tripItems[0];
        const firstTripActivities = sortActivitiesByStartDate(
          activityItems.filter((activity) => activity.trip_id === firstTrip.id),
        );
        setSelectedTripId(firstTrip.id);
        setDraft(toDraft(firstTrip));
        if (firstTripActivities.length > 0) {
          setSelectedActivityId(firstTripActivities[0].id);
          setActivityDraft(toActivityDraft(firstTripActivities[0]));
        } else {
          setSelectedActivityId("new");
          setActivityDraft(createEmptyActivityDraft(firstTrip.id));
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

  const selectTrip = (trip: TripRead) => {
    setError(null);
    setSelectedTripId(trip.id);
    setDraft(toDraft(trip));
    setCountriesExpanded(false);
    setCountryQuery("");
    setActivityGpxFile(null);
    setActivityGpxInputKey((current) => current + 1);
    const nextActivities = sortActivitiesByStartDate((activities ?? []).filter((activity) => activity.trip_id === trip.id));
    if (nextActivities.length > 0) {
      setSelectedActivityId(nextActivities[0].id);
      setActivityDraft(toActivityDraft(nextActivities[0]));
    } else {
      setSelectedActivityId("new");
      setActivityDraft(createEmptyActivityDraft(trip.id));
      setActivityGpxFile(null);
      setActivityGpxInputKey((current) => current + 1);
    }
  };

  const startNewTrip = () => {
    setError(null);
    setSelectedTripId("new");
    setDraft(createEmptyDraft());
    setCountriesExpanded(false);
    setCountryQuery("");
    setSelectedActivityId("new");
    setActivityDraft(createEmptyActivityDraft(null));
  };

  const persistTrip = async () => {
    const token = getIdToken();
    if (!token || !draft) {
      router.push("/login");
      return;
    }

    if (!draft.name.trim()) {
      setError(dict.trips.tripNameRequired);
      return;
    }

    let payload: TripWrite;
    try {
      payload = toPayload(draft);
    } catch {
      setError(dict.trips.metricsConfigInvalid);
      return;
    }

    if (payload.timezone && !timezoneSet.has(payload.timezone)) {
      setError(dict.trips.timezoneInvalid);
      return;
    }

    if (
      payload.planned_distance_m !== null &&
      (!Number.isFinite(payload.planned_distance_m) || payload.planned_distance_m < 0)
    ) {
      setError(dict.trips.plannedDistanceInvalid);
      return;
    }

    if (payload.latitude !== null && (!Number.isFinite(payload.latitude) || payload.latitude < -90 || payload.latitude > 90)) {
      setError(dict.trips.latitudeInvalid);
      return;
    }

    if (
      payload.longitude !== null &&
      (!Number.isFinite(payload.longitude) || payload.longitude < -180 || payload.longitude > 180)
    ) {
      setError(dict.trips.longitudeInvalid);
      return;
    }

    if (payload.zoom !== null && (!Number.isInteger(payload.zoom) || payload.zoom < 0 || payload.zoom > 19)) {
      setError(dict.trips.zoomInvalid);
      return;
    }

    setBusy("saving");
    setError(null);

    try {
      const saved =
        draft.id === null
          ? await createTrip(token, payload)
          : await updateTrip(token, draft.id, payload);

      startTransition(() => {
        setTrips((current) => {
          const items = current ?? [];
          return draft.id === null
              ? [saved, ...items]
              : items.map((trip) => (trip.id === saved.id ? saved : trip));
        });
        setSelectedTripId(saved.id);
        setDraft(toDraft(saved));
        setSelectedActivityId("new");
        setActivityDraft(createEmptyActivityDraft(saved.id));
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

  const removeTrip = async () => {
    const token = getIdToken();
    if (!token || !draft?.id) {
      return;
    }

    if (!window.confirm(formatMessage(dict.trips.deleteConfirm, { name: draft.name }))) {
      return;
    }

    setBusy("deleting");
    setError(null);

    try {
      await deleteTrip(token, draft.id);
      startTransition(() => {
        setTrips((current) => {
          const next = (current ?? []).filter((trip) => trip.id !== draft.id);
          if (next.length === 0) {
            setSelectedTripId("new");
            setDraft(createEmptyDraft());
            setSelectedActivityId("new");
            setActivityDraft(createEmptyActivityDraft(null));
            return next;
          }

          setSelectedTripId(next[0].id);
          setDraft(toDraft(next[0]));
          const nextActivities = sortActivitiesByStartDate(
            (activities ?? []).filter((activity) => activity.trip_id === next[0].id),
          );
          if (nextActivities.length > 0) {
            setSelectedActivityId(nextActivities[0].id);
            setActivityDraft(toActivityDraft(nextActivities[0]));
          } else {
            setSelectedActivityId("new");
            setActivityDraft(createEmptyActivityDraft(next[0].id));
          }
          return next;
        });
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

  const visibleActivities = draft?.id
    ? sortActivitiesByStartDate((activities ?? []).filter((activity) => activity.trip_id === draft.id))
    : [];
  const selectedPersistedTrip = draft?.id !== null ? (trips ?? []).find((trip) => trip.id === draft?.id) ?? null : null;
  const selectedActivity =
    activityDraft?.id !== null ? visibleActivities.find((activity) => activity.id === activityDraft?.id) ?? null : null;

  const replaceTripImages = (tripId: number, images: TripImageRead[]) => {
    setTrips((current) => (current ?? []).map((trip) => (trip.id === tripId ? { ...trip, images } : trip)));
  };

  const replaceActivityPhotos = (activityId: number, photos: ActivityPhotoRead[]) => {
    setActivities((current) =>
      (current ?? []).map((activity) => (activity.id === activityId ? { ...activity, photos } : activity)),
    );
  };

  const startNewActivity = () => {
    setError(null);
    setSelectedActivityId("new");
    setActivityDraft(createEmptyActivityDraft(draft?.id ?? null));
    setActivityGpxFile(null);
    setActivityGpxInputKey((current) => current + 1);
  };

  const selectActivity = (activity: ActivityRead) => {
    setError(null);
    setSelectedActivityId(activity.id);
    setActivityDraft(toActivityDraft(activity));
    setActivityGpxFile(null);
    setActivityGpxInputKey((current) => current + 1);
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

    setActivityBusy("uploading-gpx");
    setError(null);

    try {
      const saved = await uploadActivityGpx(token, activityDraft.id, activityGpxFile);
      startTransition(() => {
        setActivities((current) => (current ?? []).map((activity) => (activity.id === saved.id ? saved : activity)));
        setSelectedActivityId(saved.id);
        setActivityDraft(toActivityDraft(saved));
        setActivityGpxFile(null);
        setActivityGpxInputKey((current) => current + 1);
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "AUTH_REQUIRED") {
        clearIdToken();
        router.push("/login");
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    } finally {
      setActivityBusy(null);
    }
  };

  const persistActivity = async () => {
    const token = getIdToken();
    if (!token || !activityDraft || !draft?.id) {
      return;
    }

    if (!activityDraft.name.trim()) {
      setError(dict.activities.nameRequired);
      return;
    }

    const payload: ActivityWrite = {
      trip_id: draft.id,
      strava_activity_id: activityDraft.stravaActivityId ? Number(activityDraft.stravaActivityId) : null,
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
      total_elevation_gain: activityDraft.totalElevationGain ? Number(activityDraft.totalElevationGain) : null,
      description: {
        type: "blocknote",
        blocks: activityDraft.descriptionBlocks,
      },
      polyline: activityDraft.polyline.trim() || null,
      summary_polyline: activityDraft.summaryPolyline.trim() || null,
    };

    if (
      [payload.distance, payload.moving_time, payload.elapsed_time, payload.total_elevation_gain].some(
        (value) => value !== null && (!Number.isFinite(value) || value < 0),
      )
    ) {
      setError(dict.activities.invalidNumber);
      return;
    }

    setActivityBusy("saving");
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
      setActivityBusy(null);
    }
  };

  const removeCurrentActivity = async () => {
    const token = getIdToken();
    if (!token || !activityDraft?.id || !draft?.id) {
      return;
    }

    if (!window.confirm(formatMessage(dict.activities.deleteConfirm, { name: activityDraft.name }))) {
      return;
    }

    setActivityBusy("deleting");
    setError(null);

    try {
      await deleteActivity(token, activityDraft.id);
      startTransition(() => {
        const nextItems = visibleActivities.filter((activity) => activity.id !== activityDraft.id);
        setActivities((current) => (current ?? []).filter((activity) => activity.id !== activityDraft.id));
        if (nextItems.length > 0) {
          setSelectedActivityId(nextItems[0].id);
          setActivityDraft(toActivityDraft(nextItems[0]));
        } else {
          setSelectedActivityId("new");
          setActivityDraft(createEmptyActivityDraft(draft.id));
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
      setActivityBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f1e8_0%,#f8fafc_30%,#ffffff_100%)] p-6 text-stone-900">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {!trips && !error && <p className="mt-4 text-sm text-stone-600">{dict.trips.loading}</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-stone-300/80 bg-white/85 p-3 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between px-3 pb-3">
              <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                {dict.trips.title}
              </h1>
              <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">
                {trips?.length ?? 0}
              </span>
            </div>

            <div className="space-y-2">
              <button
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedTripId === "new"
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-dashed border-stone-300 bg-stone-50 hover:border-stone-400"
                }`}
                onClick={startNewTrip}
                type="button"
              >
                <div className="text-sm font-medium">{dict.trips.untitled}</div>
                <div className="mt-1 text-xs text-stone-500">{dict.trips.createNew}</div>
              </button>

              {trips?.map((trip) => (
                <button
                  key={trip.id}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedTripId === trip.id
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-stone-200 hover:border-stone-400 hover:bg-stone-50"
                  }`}
                  onClick={() => selectTrip(trip)}
                  type="button"
                >
                  <div className="truncate text-sm font-medium">{trip.name}</div>
                  <div className="mt-1 text-xs text-stone-500">
                    {trip.start_date ?? dict.trips.noStartDate}
                    {trip.end_date ? ` - ${trip.end_date}` : ""}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-4xl border border-stone-300/80 bg-white p-6 shadow-sm">
            {!draft ? (
              <p className="text-sm text-stone-500">{dict.trips.selectPrompt}</p>
            ) : (
              <div className="space-y-8">
                <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      {dict.trips.tripName}
                    </label>
                    <input
                      className="mt-2 w-full border-0 bg-transparent p-0 text-3xl font-semibold tracking-tight outline-none placeholder:text-stone-300"
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((current) => (current ? { ...current, name: value } : current));
                      }}
                      placeholder={dict.trips.tripNamePlaceholder}
                      value={draft.name}
                    />
                    <p className="mt-2 text-xs text-stone-500">
                      {draft.createdAt
                        ? `${dict.trips.created} ${new Date(draft.createdAt).toLocaleString(getDateLocale(locale))}`
                        : dict.trips.notSavedYet}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {draft.id !== null && (
                      <button
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={removeTrip}
                        type="button"
                      >
                        {busy === "deleting" ? dict.trips.deleting : dict.trips.delete}
                      </button>
                    )}
                    <button
                      className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={persistTrip}
                      type="button"
                    >
                      {busy === "saving"
                        ? dict.trips.saving
                        : draft.id === null
                          ? dict.trips.createTrip
                          : dict.trips.saveChanges}
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">{dict.trips.startDate}</span>
                    <input
                      className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((current) => (current ? { ...current, startDate: value } : current));
                      }}
                      type="date"
                      value={draft.startDate}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">{dict.trips.endDate}</span>
                    <input
                      className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((current) => (current ? { ...current, endDate: value } : current));
                      }}
                      type="date"
                      value={draft.endDate}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">{dict.trips.timezone}</span>
                    <input
                      className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                      list="trip-timezones"
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((current) => (current ? { ...current, timezone: value } : current));
                      }}
                      placeholder={dict.trips.timezonePlaceholder}
                      value={draft.timezone}
                    />
                    <datalist id="trip-timezones">
                      {timezoneOptions.map((timezone) => (
                        <option key={timezone} value={timezone} />
                      ))}
                    </datalist>
                  </label>

                  <div className="block">
                    <span className="text-sm font-medium text-stone-700">{dict.trips.countries}</span>
                    <button
                      className="mt-2 min-h-12 w-full rounded-2xl border border-stone-300 px-4 py-3 text-left outline-none transition hover:border-stone-400 focus:border-emerald-600"
                      onClick={() => {
                        setCountriesExpanded((current) => !current);
                      }}
                      type="button"
                    >
                      <span className={draft.countryCodes.length ? "text-stone-900" : "text-stone-400"}>
                        {selectedCountriesLabel}
                      </span>
                    </button>
                    <p className="mt-2 text-xs text-stone-500">{dict.trips.countriesHelp}</p>

                    {countriesExpanded && (
                      <div className="mt-3 rounded-2xl border border-stone-300 bg-stone-50 p-3">
                        <input
                          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none transition focus:border-emerald-600"
                          onChange={(event) => {
                            setCountryQuery(event.target.value);
                          }}
                          placeholder={dict.trips.countriesSearchPlaceholder}
                          value={countryQuery}
                        />

                        <div className="mt-3 max-h-44 space-y-2 overflow-auto">
                          {filteredCountryOptions.length === 0 && (
                            <p className="px-1 text-sm text-stone-500">{dict.trips.countriesEmpty}</p>
                          )}

                          {filteredCountryOptions.map((country) => {
                            const checked = draft.countryCodes.includes(country.code);

                            return (
                              <label
                                key={country.code}
                                className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm"
                              >
                                <input
                                  checked={checked}
                                  className="size-4 accent-emerald-700"
                                  onChange={() => {
                                    setDraft((current) => {
                                      if (!current) {
                                        return current;
                                      }

                                      const next = checked
                                        ? current.countryCodes.filter((code) => code !== country.code)
                                        : [...current.countryCodes, country.code];

                                      return { ...current, countryCodes: next };
                                    });
                                  }}
                                  type="checkbox"
                                />
                                <span>{country.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-lg font-semibold">{dict.trips.story}</h2>
                      <p className="text-sm text-stone-500">{dict.trips.storyDescription}</p>
                    </div>
                    <TripContentEditor
                      editorKey={draft.id === null ? "new" : String(draft.id)}
                      initialBlocks={draft.contentBlocks}
                      onChangeAction={(contentBlocks) => {
                        setDraft((current) => (current ? { ...current, contentBlocks } : current));
                      }}
                    />
                  </div>

                  <div className="space-y-5">
                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">{dict.trips.plannedDistance}</span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        inputMode="numeric"
                        onChange={(event) => {
                          const value = event.target.value;
                          setDraft((current) =>
                            current ? { ...current, plannedDistanceM: value } : current,
                          );
                        }}
                        placeholder={dict.trips.plannedDistancePlaceholder}
                        value={draft.plannedDistanceM}
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl border border-stone-300 px-4 py-3">
                      <input
                        checked={draft.showPlannedPath}
                        className="size-4 accent-emerald-700"
                        onChange={(event) => {
                          const value = event.target.checked;
                          setDraft((current) =>
                            current ? { ...current, showPlannedPath: value } : current,
                          );
                        }}
                        type="checkbox"
                      />
                      <span className="text-sm font-medium text-stone-700">{dict.trips.showPlannedPath}</span>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">{dict.trips.latitude}</span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        inputMode="decimal"
                        onChange={(event) => {
                          const value = event.target.value;
                          setDraft((current) => (current ? { ...current, latitude: value } : current));
                        }}
                        placeholder={dict.trips.latitudePlaceholder}
                        value={draft.latitude}
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">{dict.trips.longitude}</span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        inputMode="decimal"
                        onChange={(event) => {
                          const value = event.target.value;
                          setDraft((current) => (current ? { ...current, longitude: value } : current));
                        }}
                        placeholder={dict.trips.longitudePlaceholder}
                        value={draft.longitude}
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-stone-700">{dict.trips.zoom}</span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                        inputMode="numeric"
                        onChange={(event) => {
                          const value = event.target.value;
                          setDraft((current) => (current ? { ...current, zoom: value } : current));
                        }}
                        placeholder={dict.trips.zoomPlaceholder}
                        value={draft.zoom}
                      />
                    </label>
                  </div>
                </div>

                <TripImageManager
                  trip={selectedPersistedTrip}
                  onImagesChange={(images) => {
                    if (!selectedPersistedTrip) {
                      return;
                    }
                    replaceTripImages(selectedPersistedTrip.id, images);
                  }}
                />

                <section className="rounded-[2rem] border border-stone-200 bg-stone-50/70 p-5">
                  <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{dict.activities.title}</h2>
                      <p className="text-sm text-stone-500">{dict.adminHome.activitiesDescription}</p>
                    </div>
                    {draft.id !== null ? (
                      <button
                        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                        onClick={startNewActivity}
                        type="button"
                      >
                        {dict.activities.create}
                      </button>
                    ) : null}
                  </div>

                  {draft.id === null ? (
                    <p className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm text-stone-500">
                      {dict.activities.tripRequired}
                    </p>
                  ) : (
                    <div className="mt-5 grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
                      <div className="space-y-2">
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
                              onClick={() => selectActivity(activity)}
                              type="button"
                            >
                              <div className="truncate text-sm font-medium">{activity.name}</div>
                              <div className="mt-1 text-xs text-stone-500">{activity.sport_type ?? activity.type ?? "—"}</div>
                            </button>
                          ))
                        )}
                      </div>

                      {!activityDraft ? null : (
                        <div className="space-y-5 rounded-[1.5rem] border border-stone-200 bg-white p-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                                {dict.activities.name}
                              </label>
                              <input
                                className="mt-2 w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight outline-none placeholder:text-stone-300"
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setActivityDraft((current) => (current ? { ...current, name: value } : current));
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
                                  disabled={activityBusy !== null}
                                  onClick={removeCurrentActivity}
                                  type="button"
                                >
                                  {activityBusy === "deleting" ? dict.activities.deleting : dict.activities.delete}
                                </button>
                              ) : null}
                              <button
                                className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={activityBusy !== null}
                                onClick={persistActivity}
                                type="button"
                              >
                                {activityBusy === "saving"
                                  ? dict.activities.saving
                                  : activityDraft.id === null
                                    ? dict.activities.create
                                    : dict.activities.save}
                              </button>
                            </div>
                          </div>

                          <TripContentEditor
                              editorKey={activityDraft.id === null ? `new-${draft.id}` : `activity-${activityDraft.id}`}
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
                                    setActivityDraft((current) => (current ? { ...current, [field]: value } : current));
                                  }}
                                  value={activityDraft[field as keyof ActivityDraft] as string}
                                />
                              </label>
                            ))}
                          </div>

                          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            <label className="block">
                              <span className="text-sm font-medium text-stone-700">{dict.activities.startDate}</span>
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
                              <span className="text-sm font-medium text-stone-700">{dict.activities.type}</span>
                              <input
                                className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                                onChange={(event) => {
                                  setActivityDraft((current) => (current ? { ...current, type: event.target.value } : current));
                                }}
                                value={activityDraft.type}
                              />
                            </label>
                            <label className="block">
                              <span className="text-sm font-medium text-stone-700">{dict.activities.sportType}</span>
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
                              <span className="text-sm font-medium text-stone-700">{dict.activities.distance}</span>
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
                              <span className="text-sm font-medium text-stone-700">{dict.activities.movingTime}</span>
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
                              <span className="text-sm font-medium text-stone-700">{dict.activities.elapsedTime}</span>
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
                              <span className="text-sm font-medium text-stone-700">{dict.activities.totalElevationGain}</span>
                              <input
                                className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                                inputMode="decimal"
                                onChange={(event) => {
                                  setActivityDraft((current) =>
                                    current ? { ...current, totalElevationGain: event.target.value } : current,
                                  );
                                }}
                                value={activityDraft.totalElevationGain}
                              />
                            </label>
                          </div>

                          <div>
                            <div className="space-y-5">
                              <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                                <p className="text-sm font-medium text-stone-700">{dict.activities.gpxFile}</p>
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
                                  disabled={activityBusy !== null}
                                  onClick={() => {
                                    void uploadCurrentActivityGpx();
                                  }}
                                  type="button"
                                >
                                  {activityBusy === "uploading-gpx" ? dict.activities.gpxUploading : dict.activities.gpxUpload}
                                </button>
                              </div>

                              <label className="block">
                                <span className="text-sm font-medium text-stone-700">{dict.activities.polyline}</span>
                                <textarea
                                  className="mt-2 min-h-32 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                                  onChange={(event) => {
                                    setActivityDraft((current) =>
                                      current ? { ...current, polyline: event.target.value } : current,
                                    );
                                  }}
                                  value={activityDraft.polyline}
                                />
                              </label>
                              <label className="block">
                                <span className="text-sm font-medium text-stone-700">{dict.activities.summaryPolyline}</span>
                                <textarea
                                  className="mt-2 min-h-32 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600"
                                  onChange={(event) => {
                                    setActivityDraft((current) =>
                                      current ? { ...current, summaryPolyline: event.target.value } : current,
                                    );
                                  }}
                                  value={activityDraft.summaryPolyline}
                                />
                              </label>
                            </div>
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
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
