"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { MapyMap } from "@/components/mapy-map";
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

export function TripMapPage({ trip }: { trip: TripRead }) {
  const { dict } = useI18n();
  const [error, setError] = useState<string | null>(null);

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
        onError={(message) => {
          setError(message === "missing_api_key" ? dict.publicSite.mapMissingApiKey : null);
        }}
      />

      <div className="absolute left-4 top-4 z-[1000] max-w-sm rounded-[1.75rem] border border-stone-200 bg-white/95 px-5 py-4 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.45)] backdrop-blur">
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
      </div>
    </main>
  );
}
