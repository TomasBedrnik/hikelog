"use client";

import Link from "next/link";
import { useState } from "react";
import { ActivityRead } from "@/lib/activities";
import { ActivityPhotoGallery } from "@/components/activity-photo-gallery";
import { useI18n } from "@/components/i18n-provider";
import { getDateLocale } from "@/lib/i18n";
import { getTripContentBlocks, hasTripContent } from "@/lib/blocknote";
import { MapyMap } from "@/components/mapy-map";
import { TripContentRenderer } from "@/components/trip-content-renderer";

function formatDateTime(value: string | null, locale: "en" | "cs") {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(getDateLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDistance(value: number | null, locale: "en" | "cs") {
  if (value === null) {
    return null;
  }

  return `${(value / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} km`;
}

export function PublicActivityPage({ activity }: { activity: ActivityRead }) {
  const { dict, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const descriptionBlocks = getTripContentBlocks(activity.description);
  const hasDescription = hasTripContent(activity.description);
  const photoItems = activity.photos.map((photo) => ({
    id: photo.id,
    imageUrl: photo.image_url,
    thumbnailUrl: photo.thumbnail_url,
    alt: photo.original_filename ?? activity.name,
  }));

  const infoItems = [
    {
      label: dict.activities.type,
      value: activity.sport_type ?? activity.type ?? dict.publicSite.metaEmpty,
    },
    {
      label: dict.activities.startDate,
      value: formatDateTime(activity.start_date, locale) ?? dict.publicSite.metaEmpty,
    },
    {
      label: dict.activities.distance,
      value: formatDistance(activity.distance, locale) ?? dict.publicSite.metaEmpty,
    },
    {
      label: dict.activities.movingTime,
      value: activity.moving_time?.toLocaleString(locale) ?? dict.publicSite.metaEmpty,
    },
    {
      label: dict.activities.elapsedTime,
      value: activity.elapsed_time?.toLocaleString(locale) ?? dict.publicSite.metaEmpty,
    },
    {
      label: dict.activities.totalElevationGain,
      value: activity.total_elevation_gain?.toLocaleString(locale) ?? dict.publicSite.metaEmpty,
    },
  ];

  return (
    <main className="relative h-screen w-full overflow-hidden bg-stone-200">
      <MapyMap
        polyline={activity.summary_polyline ?? activity.polyline}
        onError={(message) => {
          setError(message === "missing_api_key" ? dict.publicSite.mapMissingApiKey : null);
        }}
      />

      {photoItems.length > 0 ? (
        <div className="absolute left-4 right-4 top-4 z-[1000] rounded-[1.75rem] border border-stone-200 bg-white/90 px-4 py-4 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.45)] backdrop-blur">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
            {dict.activityPhotos.publicTitle}
          </p>
          <ActivityPhotoGallery items={photoItems} layout="strip" />
        </div>
      ) : null}

      <div
        className="absolute left-4 z-[1000] max-h-[calc(100vh-2rem)] w-[min(26rem,calc(100vw-2rem))] overflow-auto rounded-[1.75rem] border border-stone-200 bg-white/95 px-5 py-4 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.45)] backdrop-blur"
        style={{ top: photoItems.length > 0 ? "11.5rem" : "1rem" }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-400">{dict.activities.mapEyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{activity.name}</h1>

        <Link
          className="mt-4 inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          href={`/trips/${activity.trip_id}`}
        >
          {dict.activities.backToTrip}
        </Link>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <dl className="mt-5 space-y-4">
          {infoItems.map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">{item.label}</dt>
              <dd className="mt-1 text-sm text-stone-700">{item.value}</dd>
            </div>
          ))}
        </dl>

        {hasDescription ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              {dict.activities.descriptionTitle}
            </p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <TripContentRenderer blocks={descriptionBlocks} editorKey={`activity-${activity.id}-description`} />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
