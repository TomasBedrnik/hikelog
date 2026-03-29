"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { decodePolyline, ensureLeafletAssets } from "@/lib/leaflet";

type PolylineStyle = {
  color?: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
};

type RouteStyle = {
  outline?: PolylineStyle;
  inner?: PolylineStyle;
};

type MapMarker = {
  id: number | string;
  latitude: number;
  longitude: number;
  title?: string | null;
  thumbnailUrl?: string | null;
};

type MapyMapProps = {
  center?: {
    latitude: number;
    longitude: number;
    zoom: number;
  } | null;
  polyline?: string | null;
  markers?: MapMarker[];
  onMarkerClick?: (markerId: number | string) => void;
  routeStyle?: RouteStyle;
  className?: string;
  onError?: (message: string | null) => void;
};

const DEFAULT_CENTER = {
  latitude: 49.8175,
  longitude: 15.473,
  zoom: 7,
};

const DEFAULT_ROUTE_STYLE: Required<RouteStyle> = {
  outline: {
    color: "#7f49f1",
    weight: 6,
    opacity: 1,
    lineCap: "round",
    lineJoin: "round",
  },
  inner: {
    color: "black",
    weight: 2,
    opacity: 1,
    dashArray: "6,6",
    lineCap: "round",
    lineJoin: "round",
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildMarkerIcon(marker: MapMarker, leaflet: NonNullable<Window["L"]>) {
  if (!marker.thumbnailUrl) {
    return undefined;
  }

  const title = marker.title ? ` alt="${escapeHtml(marker.title)}"` : "";
  return leaflet.divIcon({
    className: "",
    iconSize: [44, 56],
    iconAnchor: [22, 56],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="height:40px;width:40px;overflow:hidden;border:2px solid white;border-radius:9999px;background:#e7e5e4;box-shadow:0 10px 24px -12px rgba(0,0,0,0.7);">
          <img src="${escapeHtml(marker.thumbnailUrl)}"${title} style="display:block;height:100%;width:100%;object-fit:cover;" />
        </div>
        <div style="margin-top:-2px;height:0;width:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:14px solid white;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.35));"></div>
      </div>
    `,
  });
}

export function MapyMap({
  center = null,
  polyline = null,
  markers = [],
  onMarkerClick,
  routeStyle,
  className = "h-full w-full",
  onError,
}: MapyMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const emitError = useEffectEvent((message: string | null) => {
    onError?.(message);
  });
  const emitMarkerClick = useEffectEvent((markerId: number | string) => {
    onMarkerClick?.(markerId);
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_MAPYCOM_API_KEY;
    if (!apiKey) {
      emitError("missing_api_key");
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

      for (const marker of markers) {
        const leafletMarker = window.L.marker([marker.latitude, marker.longitude], {
          icon: buildMarkerIcon(marker, window.L),
          title: marker.title ?? undefined,
        }).addTo(map);
        leafletMarker.on("click", () => {
          emitMarkerClick(marker.id);
        });
      }

      const allPoints = [
        ...routePoints,
        ...markers.map((marker) => [marker.latitude, marker.longitude] as [number, number]),
      ];

      if (routePoints.length > 0) {
        const styles = {
          outline: {
            ...DEFAULT_ROUTE_STYLE.outline,
            ...routeStyle?.outline,
          },
          inner: {
            ...DEFAULT_ROUTE_STYLE.inner,
            ...routeStyle?.inner,
          },
        };

        window.L.polyline(routePoints, styles.outline).addTo(map);
        window.L.polyline(routePoints, styles.inner).addTo(map);
      }

      if (allPoints.length > 1) {
        map.fitBounds(window.L.latLngBounds(allPoints), { padding: [48, 48] });
      } else if (allPoints.length === 1) {
        map.setView(allPoints[0], 14);
      } else {
        const nextCenter = center ?? DEFAULT_CENTER;
        map.setView([nextCenter.latitude, nextCenter.longitude], nextCenter.zoom);
      }

      emitError(null);
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
  }, [center, emitError, emitMarkerClick, markers, mounted, polyline, routeStyle]);

  return <div ref={mapRef} className={className} />;
}
