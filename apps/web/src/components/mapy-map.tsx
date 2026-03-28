"use client";

import { useEffect, useRef, useState } from "react";
import { decodePolyline, ensureLeafletAssets } from "@/lib/leaflet";

type MapyMapProps = {
  center?: {
    latitude: number;
    longitude: number;
    zoom: number;
  } | null;
  polyline?: string | null;
  className?: string;
  onError?: (message: string | null) => void;
};

const DEFAULT_CENTER = {
  latitude: 49.8175,
  longitude: 15.473,
  zoom: 7,
};

export function MapyMap({
  center = null,
  polyline = null,
  className = "h-full w-full",
  onError,
}: MapyMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_MAPYCOM_API_KEY;
    if (!apiKey) {
      onError?.("missing_api_key");
      return;
    }

    ensureLeafletAssets();

    let cancelled = false;
    let mapInstance: { remove: () => void } | null = null;

    const mountMap = () => {
      if (cancelled || !mapRef.current || !window.L) {
        return false;
      }

      const map = window.L.map(mapRef.current, { zoomControl: false });

      window.L.tileLayer(`https://api.mapy.com/v1/maptiles/outdoor/256/{z}/{x}/{y}?apikey=${apiKey}`, {
        minZoom: 0,
        maxZoom: 19,
        attribution:
          '<a href="https://api.mapy.com/copyright" target="_blank" rel="noreferrer">&copy; Seznam.cz a.s. and others</a>',
      }).addTo(map);

      let routePoints: [number, number][] = [];
      if (polyline) {
        try {
          routePoints = decodePolyline(polyline);
        } catch {
          routePoints = [];
        }
      }

      if (routePoints.length > 0) {
        const route = window.L.polyline(routePoints, {
          color: "#0f766e",
          weight: 4,
        }).addTo(map);
        map.fitBounds(route.getBounds(), { padding: [48, 48] });
      } else {
        const nextCenter = center ?? DEFAULT_CENTER;
        map.setView([nextCenter.latitude, nextCenter.longitude], nextCenter.zoom);
      }

      onError?.(null);
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
  }, [center, mounted, onError, polyline]);

  return <div ref={mapRef} className={className} />;
}
