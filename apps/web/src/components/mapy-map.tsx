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

type MapRoute = {
  polyline: string;
  style?: RouteStyle;
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
  routes?: MapRoute[];
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
  routes = [],
  markers = [],
  onMarkerClick,
  routeStyle,
  className = "h-full w-full",
  onError,
}: MapyMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<ReturnType<NonNullable<Window["L"]>["map"]> | null>(null);
  const routeLayersRef = useRef<Array<{ remove: () => void }>>([]);
  const markerLayersRef = useRef<Array<{ remove: () => void }>>([]);
  const previousViewSignatureRef = useRef<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mapReadyVersion, setMapReadyVersion] = useState(0);
  const apiKey = process.env.NEXT_PUBLIC_MAPYCOM_API_KEY;
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

    if (!apiKey) {
      emitError("missing_api_key");
      return;
    }

    ensureLeafletAssets();

    let cancelled = false;

    const ensureMap = () => {
      if (cancelled || !mapRef.current || !window.L || mapInstanceRef.current) {
        return false;
      }

      const map = window.L.map(mapRef.current, { zoomControl: false });

      window.L.tileLayer(`https://api.mapy.com/v1/maptiles/outdoor/256/{z}/{x}/{y}?apikey=${apiKey}`, {
        minZoom: 0,
        maxZoom: 19,
        attribution:
          '<a href="https://api.mapy.com/copyright" target="_blank" rel="noreferrer">&copy; Seznam.cz a.s. and others</a>',
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapReadyVersion((current) => current + 1);
      emitError(null);
      return true;
    };

    if (ensureMap()) {
      return () => {
        cancelled = true;
        routeLayersRef.current.forEach((layer) => layer.remove());
        markerLayersRef.current.forEach((layer) => layer.remove());
        routeLayersRef.current = [];
        markerLayersRef.current = [];
        mapInstanceRef.current?.remove();
        mapInstanceRef.current = null;
        previousViewSignatureRef.current = null;
      };
    }

    const interval = window.setInterval(() => {
      if (ensureMap()) {
        window.clearInterval(interval);
      }
    }, 100);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiKey, mounted]);

  useEffect(() => {
    if (!mounted || !mapInstanceRef.current || !window.L || mapReadyVersion === 0) {
      return;
    }

    const map = mapInstanceRef.current;

    routeLayersRef.current.forEach((layer) => layer.remove());
    markerLayersRef.current.forEach((layer) => layer.remove());
    routeLayersRef.current = [];
    markerLayersRef.current = [];

    let primaryRoutePoints: [number, number][] = [];
    if (polyline) {
      try {
        primaryRoutePoints = decodePolyline(polyline);
      } catch {
        primaryRoutePoints = [];
      }
    }

    const decodedRoutes = routes.flatMap((route) => {
      try {
        return [
          {
            points: decodePolyline(route.polyline),
            style: route.style,
            polyline: route.polyline,
          },
        ];
      } catch {
        return [];
      }
    });

    for (const marker of markers) {
      const leafletMarker = window.L.marker([marker.latitude, marker.longitude], {
        icon: buildMarkerIcon(marker, window.L),
        title: marker.title ?? undefined,
      }).addTo(map);
      leafletMarker.on("click", () => {
        emitMarkerClick(marker.id);
      });
      markerLayersRef.current.push(leafletMarker);
    }

    const allPoints = [
      ...primaryRoutePoints,
      ...decodedRoutes.flatMap((route) => route.points),
      ...markers.map((marker) => [marker.latitude, marker.longitude] as [number, number]),
    ];

    if (primaryRoutePoints.length > 0) {
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

      routeLayersRef.current.push(window.L.polyline(primaryRoutePoints, styles.outline).addTo(map));
      routeLayersRef.current.push(window.L.polyline(primaryRoutePoints, styles.inner).addTo(map));
    }

    for (const route of decodedRoutes) {
      if (route.points.length === 0) {
        continue;
      }

      const styles = {
        outline: {
          ...DEFAULT_ROUTE_STYLE.outline,
          ...route.style?.outline,
        },
        inner: route.style?.inner
          ? {
              ...DEFAULT_ROUTE_STYLE.inner,
              ...route.style.inner,
            }
          : null,
      };

      routeLayersRef.current.push(window.L.polyline(route.points, styles.outline).addTo(map));
      if (styles.inner) {
        routeLayersRef.current.push(window.L.polyline(route.points, styles.inner).addTo(map));
      }
    }

    const viewSignature = JSON.stringify({
      center,
      polyline,
      routes: routes.map((route) => route.polyline),
      markers: markers.map((marker) => [marker.latitude, marker.longitude, marker.id]),
    });

    if (previousViewSignatureRef.current !== viewSignature) {
      if (allPoints.length > 1) {
        map.fitBounds(window.L.latLngBounds(allPoints), { padding: [48, 48] });
      } else if (allPoints.length === 1) {
        map.setView(allPoints[0], 14);
      } else {
        const nextCenter = center ?? DEFAULT_CENTER;
        map.setView([nextCenter.latitude, nextCenter.longitude], nextCenter.zoom);
      }
      previousViewSignatureRef.current = viewSignature;
    }

    emitError(null);
  }, [center, mapReadyVersion, markers, mounted, polyline, routeStyle, routes]);

  return <div ref={mapRef} className={className} />;
}
