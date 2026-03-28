"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { TripRead } from "@/lib/trips";

const LEAFLET_CSS_ID = "leaflet-css";
const LEAFLET_SCRIPT_ID = "leaflet-script";
const DEFAULT_LATITUDE = 49.8175;
const DEFAULT_LONGITUDE = 15.473;
const DEFAULT_ZOOM = 7;

declare global {
  interface Window {
    L?: {
      map: (element: HTMLElement) => {
        setView: (center: [number, number], zoom: number) => unknown;
        remove: () => void;
      };
      tileLayer: (
        urlTemplate: string,
        options: {
          attribution: string;
          minZoom?: number;
          maxZoom?: number;
        },
      ) => {
        addTo: (map: unknown) => void;
      };
    };
  }
}

function ensureLeafletAssets() {
  if (!document.getElementById(LEAFLET_CSS_ID)) {
    const link = document.createElement("link");
    link.id = LEAFLET_CSS_ID;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  if (!document.getElementById(LEAFLET_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = LEAFLET_SCRIPT_ID;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    document.body.appendChild(script);
  }
}

export function TripMapPage({ trip }: { trip: TripRead }) {
  const { dict } = useI18n();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_MAPYCOM_API_KEY;
    if (!apiKey) {
      setError(dict.publicSite.mapMissingApiKey);
      return;
    }

    ensureLeafletAssets();

    let cancelled = false;
    let mapInstance: { remove: () => void } | null = null;

    const mountMap = () => {
      if (cancelled || !mapRef.current || !window.L) {
        return false;
      }

      const latitude = trip.latitude ?? DEFAULT_LATITUDE;
      const longitude = trip.longitude ?? DEFAULT_LONGITUDE;
      const zoom = trip.zoom ?? DEFAULT_ZOOM;
      const map = window.L.map(mapRef.current);
      map.setView([latitude, longitude], zoom);

      window.L.tileLayer(`https://api.mapy.com/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${apiKey}`, {
        minZoom: 0,
        maxZoom: 19,
        attribution:
          '<a href="https://api.mapy.com/copyright" target="_blank" rel="noreferrer">&copy; Seznam.cz a.s. and others</a>',
      }).addTo(map);

      mapInstance = map;
      return true;
    };

    if (mountMap()) {
      return () => {
        cancelled = true;
        mapInstance?.remove();
      };
    }

    const interval = window.setInterval(() => {
      if (mountMap()) {
        window.clearInterval(interval);
      }
    }, 100);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      mapInstance?.remove();
    };
  }, [dict.publicSite.mapMissingApiKey, trip.latitude, trip.longitude, trip.zoom]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-stone-200">
      <div ref={mapRef} className="h-full w-full" />

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
