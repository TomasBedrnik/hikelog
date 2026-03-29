"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { MapyMap } from "@/components/mapy-map";
import { getFirstParagraphText } from "@/lib/blocknote";
import { ActivitySummaryRead } from "@/lib/activities";
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

export function TripMapPage({
  trip,
  activities,
}: {
  trip: TripRead;
  activities: ActivitySummaryRead[];
}) {
  const { dict } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const activityRoutes = activities.flatMap((activity, index) => {
    if (!activity.summary_polyline) {
      return [];
    }

    return [
      {
        polyline: activity.summary_polyline,
        style: {
          outline: {
            color: ACTIVITY_ROUTE_COLORS[index % ACTIVITY_ROUTE_COLORS.length],
            weight: 4,
            opacity: 0.95,
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
        onError={(message) => {
          setError(message === "missing_api_key" ? dict.publicSite.mapMissingApiKey : null);
        }}
      />

      <div className="absolute left-4 top-4 z-[1000] max-h-[calc(100vh-2rem)] w-[min(27rem,calc(100vw-2rem))] overflow-auto rounded-[1.75rem] border border-stone-200 bg-white/95 px-5 py-4 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.45)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-400">{dict.publicSite.mapEyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
          {trip.name || dict.publicSite.untitledTrip}
        </h1>
        <Link
          className="mt-4 inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          href={`/trips/${trip.id}`}
        >
          {dict.publicSite.backToTrip}
        </Link>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">{dict.activities.publicTitle}</p>
          {activities.length === 0 ? (
            <p className="text-sm text-stone-500">{dict.activities.emptyPublic}</p>
          ) : (
            activities.map((activity) => (
              <Link
                key={activity.id}
                className="block rounded-[1.25rem] border border-stone-200 bg-stone-50 px-4 py-3 transition hover:border-emerald-700 hover:bg-emerald-50"
                href={`/activities/${activity.id}`}
              >
                <p className="text-sm font-semibold text-stone-900">{activity.name}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {getFirstParagraphText(activity.description) ?? dict.publicSite.contentEmpty}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
