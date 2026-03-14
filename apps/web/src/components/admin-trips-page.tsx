"use client";

import { PartialBlock } from "@blocknote/core";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { useI18n } from "@/components/i18n-provider";
import { TripContentEditor } from "@/components/trip-content-editor";
import { formatMessage, getDateLocale } from "@/lib/i18n";
import { getCountryOptions, getTimezoneOptions } from "@/lib/options";
import { createTrip, deleteTrip, listTrips, TripRead, TripWrite, updateTrip } from "@/lib/trips";

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
  metricsConfigText: string;
  createdAt: string | null;
};

function toEditorBlocks(content: TripRead["content"]): PartialBlock[] {
  if (!content) {
    return EMPTY_BLOCKS;
  }

  const blocks = content.blocks;
  if (Array.isArray(blocks) && blocks.length > 0) {
    return blocks as PartialBlock[];
  }

  return EMPTY_BLOCKS;
}

function formatJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

function toDraft(trip: TripRead): TripDraft {
  return {
    id: trip.id,
    name: trip.name,
    contentBlocks: toEditorBlocks(trip.content),
    startDate: trip.start_date ?? "",
    endDate: trip.end_date ?? "",
    timezone: trip.timezone ?? "",
    countryCodes: trip.country_codes,
    plannedDistanceM: trip.planned_distance_m?.toString() ?? "",
    plannedPathPolyline: trip.planned_path_polyline ?? "",
    showPlannedPath: trip.show_planned_path,
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
    metricsConfigText: "{}",
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
  const [selectedTripId, setSelectedTripId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<TripDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"saving" | "deleting" | null>(null);
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

    listTrips(token)
      .then((data) => {
        setTrips(data);
        if (data.length === 0) {
          setSelectedTripId("new");
          setDraft(createEmptyDraft());
          return;
        }

        setSelectedTripId(data[0].id);
        setDraft(toDraft(data[0]));
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
  };

  const startNewTrip = () => {
    setError(null);
    setSelectedTripId("new");
    setDraft(createEmptyDraft());
    setCountriesExpanded(false);
    setCountryQuery("");
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
            return next;
          }

          setSelectedTripId(next[0].id);
          setDraft(toDraft(next[0]));
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
                      onChange={(contentBlocks) => {
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
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
