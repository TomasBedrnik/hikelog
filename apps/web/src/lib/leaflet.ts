const LEAFLET_CSS_ID = "leaflet-css";
const LEAFLET_SCRIPT_ID = "leaflet-script";

declare global {
  interface Window {
    L?: {
      layer: {
        remove: () => void;
      };
      map: (
        element: HTMLElement,
        options?: {
          zoomControl?: boolean;
        },
      ) => {
        setView: (center: [number, number], zoom: number) => unknown;
        fitBounds: (bounds: unknown, options?: { padding?: [number, number] }) => unknown;
        on: (event: "click", handler: () => void) => void;
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
      polyline: (
        latlngs: [number, number][],
        options?: {
          color?: string;
          weight?: number;
          opacity?: number;
          dashArray?: string;
          lineCap?: "butt" | "round" | "square";
          lineJoin?: "miter" | "round" | "bevel";
        },
      ) => {
        addTo: (map: unknown) => {
          getBounds: () => unknown;
          on: (
            event: "click",
            handler: (event: { originalEvent?: { stopPropagation?: () => void } }) => void,
          ) => void;
          remove: () => void;
        };
      };
      marker: (
        latlng: [number, number],
        options?: {
          title?: string;
          icon?: unknown;
        },
      ) => {
        addTo: (map: unknown) => {
          on: (event: "click", handler: () => void) => void;
          remove: () => void;
        };
      };
      divIcon: (options: {
        className?: string;
        html?: string;
        iconSize?: [number, number];
        iconAnchor?: [number, number];
      }) => unknown;
      latLngBounds: (latlngs: [number, number][]) => unknown;
    };
  }
}

export function ensureLeafletAssets() {
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

export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([latitude / 1e5, longitude / 1e5]);
  }

  return points;
}
