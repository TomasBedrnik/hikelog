"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { MapyMap } from "@/components/mapy-map";
import { getFirstParagraphText } from "@/lib/blocknote";
import { ActivitySummaryRead } from "@/lib/activities";
import { getDateLocale } from "@/lib/i18n";
import { TripRead } from "@/lib/trips";

const TRIP_ROUTE_STYLE = {
  outline: {
    color: "#55ffff",
    weight: 6,
    opacity: 1,
    lineCap: "round" as const,
    lineJoin: "round" as const,
  },
  inner: {
    color: "white",
    weight: 2,
    opacity: 1,
    dashArray: "6,6",
    lineCap: "round" as const,
    lineJoin: "round" as const,
  },
};

const ACTIVITY_ROUTE_COLORS = [
  "#e41a1c",
  "#377eb8",
  "#b3ff00",
  "#ff00fc",
  "#ff7f00",
  "#ffff33",
  "#a65628",
  "#7f49f1",
];

function formatDate(value: string | null, locale: "en" | "cs") {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(getDateLocale(locale), { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatNumber(
  value: number | null,
  locale: "en" | "cs",
  options?: Intl.NumberFormatOptions,
) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return new Intl.NumberFormat(getDateLocale(locale), options).format(value);
}

export function TripMapPage({
  trip,
  activities,
}: {
  trip: TripRead;
  activities: ActivitySummaryRead[];
}) {
  const { dict, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [hoveredActivityId, setHoveredActivityId] = useState<number | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const totalDistanceMeters = activities.reduce(
    (sum, activity) => sum + (activity.distance ?? 0),
    0,
  );
  const totalMovingTimeSeconds = activities.reduce(
    (sum, activity) => sum + (activity.moving_time ?? 0),
    0,
  );
  const totalElevationGainMeters = activities.reduce(
    (sum, activity) => sum + (activity.total_elevation_gain ?? 0),
    0,
  );
  const totalDistanceKm = totalDistanceMeters > 0 ? totalDistanceMeters / 1000 : null;
  const totalMovingHours = totalMovingTimeSeconds > 0 ? totalMovingTimeSeconds / 3600 : null;
  const totalTripDays = activities.length > 0 ? activities.length : null;
  const metaItems = [
    {
      label: dict.publicSite.startDate,
      value: formatDate(trip.start_date, locale),
    },
    {
      label: dict.publicSite.endDate,
      value: formatDate(trip.end_date, locale),
    },
    {
      label: dict.publicSite.walkedDistance,
      value:
        totalDistanceKm === null
          ? null
          : `${formatNumber(totalDistanceKm, locale, { maximumFractionDigits: 1 })} km`,
    },
    {
      label: dict.publicSite.walkedTime,
      value:
        totalMovingHours === null
          ? null
          : `${formatNumber(totalMovingHours, locale, { maximumFractionDigits: 1 })} h`,
    },
    {
      label: dict.publicSite.tripDays,
      value: totalTripDays === null ? null : formatNumber(totalTripDays, locale),
    },
    {
      label: dict.publicSite.elevationGain,
      value:
        totalElevationGainMeters === null
          ? null
          : `${formatNumber(totalElevationGainMeters, locale, { maximumFractionDigits: 0 })} m`,
    },
  ].filter((item) => item.value !== null);
  const activityRoutes = activities.flatMap((activity, index) => {
    if (!activity.summary_polyline) {
      return [];
    }

    const isActive = selectedActivityId === activity.id || hoveredActivityId === activity.id;
    return [
      {
        id: activity.id,
        polyline: activity.summary_polyline,
        style: {
          outline: {
            color: ACTIVITY_ROUTE_COLORS[index % ACTIVITY_ROUTE_COLORS.length],
            weight: isActive ? 10 : 6,
            opacity: 0.95,
            lineCap: "round" as const,
            lineJoin: "round" as const,
          },
          inner: {
            color: "black",
            weight: isActive ? 0 : 2,
            opacity: 1,
            dashArray: "6,6",
            lineCap: "round" as const,
            lineJoin: "round" as const,
          },
        },
      },
    ];
  });

  return (
    <main className="relative h-screen w-full overflow-hidden bg-stone-200">
      <MapyMap
        center={{
          latitude: trip.latitude ?? 49.8175,
          longitude: trip.longitude ?? 15.473,
          zoom: trip.zoom ?? 7,
        }}
        polyline={trip.show_planned_path ? trip.planned_path_polyline : null}
        routeStyle={TRIP_ROUTE_STYLE}
        routes={activityRoutes}
        onMapClick={() => {
          setSelectedActivityId(null);
        }}
        onRouteClick={(routeId) => {
          setSelectedActivityId(Number(routeId));
        }}
        onError={(message) => {
          setError(message === "missing_api_key" ? dict.publicSite.mapMissingApiKey : null);
        }}
      />

      <div
        className="absolute left-4 top-4 z-[1000]
                flex max-h-[70vh] md:max-h-[calc(100vh-2rem)] w-[min(27rem,calc(100vw-2rem))] flex-col
                rounded-[1.75rem] border border-stone-200 bg-white/95 px-5 py-4
                shadow-[0_20px_60px_-30px_rgba(28,25,23,0.45)] backdrop-blur"
      >
        <h1 className="mt-2 flex w-full justify-between gap-3 text-2xl font-semibold tracking-tight text-stone-950">
          <span>{trip.name || dict.publicSite.untitledTrip}</span>
          <span className="flex shrink-0 items-center gap-2">
            <Link
              aria-label="Home"
              className="inline-flex size-9 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-stone-700 transition hover:border-emerald-600 hover:bg-emerald-50"
              href="/"
            >
              <Image
                alt=""
                aria-hidden="true"
                className="size-4"
                height={16}
                src="/icons/home.svg"
                width={16}
              />
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-stone-50 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:border-emerald-600 hover:bg-emerald-50"
              onClick={() => {
                setIsPanelCollapsed((current) => !current);
              }}
            >
              {isPanelCollapsed ? (
                <>
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="size-4"
                    height={16}
                    src="/icons/eye-light.svg"
                    width={16}
                  />
                  <span>{dict.common.show}</span>
                </>
              ) : (
                <>
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="size-4"
                    height={16}
                    src="/icons/eye-slash-light.svg"
                    width={16}
                  />
                  <span>{dict.common.hide}</span>
                </>
              )}
            </button>
          </span>
        </h1>
        {!isPanelCollapsed ? (
          <>
            <Link
              className="mt-4 mr-auto inline-flex items-center gap-2 justify-center rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-emerald-600 hover:bg-emerald-50"
              href={`/trips/${trip.id}`}
            >
              {dict.publicSite.backToTrip}

              <Image
                alt=""
                aria-hidden="true"
                className="size-4"
                height={16}
                src="/icons/map-trifold-light.svg"
                width={16}
              />
            </Link>
            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

            <dl className="mt-6 grid gap-3 grid-cols-2">
              {metaItems.map((item) => (
                <div key={item.label} className="rounded-[1.25rem] bg-stone-50 px-4 py-3">
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm text-stone-700">{item.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex-1 overflow-y-auto space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                {dict.activities.publicTitle}
              </p>
              {activities.length === 0 ? (
                <p className="text-sm text-stone-500">{dict.activities.emptyPublic}</p>
              ) : (
                activities.map((activity) => (
                  <Link
                    key={activity.id}
                    className={`block rounded-[1.25rem] border px-4 py-3 transition ${
                      selectedActivityId === activity.id
                        ? "border-emerald-700 bg-emerald-100"
                        : "border-stone-200 bg-stone-50 hover:border-emerald-700 hover:bg-emerald-50"
                    }`}
                    href={`/activities/${activity.id}`}
                    onMouseEnter={() => {
                      setHoveredActivityId(activity.id);
                    }}
                    onMouseLeave={() => {
                      setHoveredActivityId((current) => (current === activity.id ? null : current));
                    }}
                  >
                    <p className="text-sm font-semibold text-stone-900">{activity.name}</p>
                    <p className="mt-1 text-sm leading-6 text-stone-600">
                      {getFirstParagraphText(activity.description) ?? dict.publicSite.contentEmpty}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
