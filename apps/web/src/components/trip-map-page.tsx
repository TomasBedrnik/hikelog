"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { MapyMap } from "@/components/mapy-map";
import { TripRead } from "@/lib/trips";

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
