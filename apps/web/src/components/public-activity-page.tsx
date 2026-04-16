"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { ActivityRead, ActivitySummaryRead, sortActivitiesByStartDate } from "@/lib/activities";
import { ActivityMediaGallery } from "@/components/activity-media-gallery";
import { CommentsSection } from "@/components/comments-section";
import { useI18n } from "@/components/i18n-provider";
import { getDateLocale } from "@/lib/i18n";
import { getTripContentBlocks, hasTripContent } from "@/lib/blocknote";
import { MapyMap } from "@/components/mapy-map";
import { TripContentRenderer } from "@/components/trip-content-renderer";
import { MediaLightbox } from "@/components/media-lightbox";
import { createPublicActivityComment } from "@/lib/comments";

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

export function PublicActivityPage({
  activity,
  tripActivities,
}: {
  activity: ActivityRead;
  tripActivities: ActivitySummaryRead[];
}) {
  const { dict, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [comments, setComments] = useState(activity.comments);
  const sortedTripActivities = useMemo(
    () => sortActivitiesByStartDate(tripActivities).reverse(),
    [tripActivities],
  );
  const currentActivityIndex = sortedTripActivities.findIndex((item) => item.id === activity.id);
  const previousActivity =
    currentActivityIndex > 0 ? sortedTripActivities[currentActivityIndex - 1] : null;
  const nextActivity =
    currentActivityIndex >= 0 && currentActivityIndex < sortedTripActivities.length - 1
      ? sortedTripActivities[currentActivityIndex + 1]
      : null;
  const descriptionBlocks = getTripContentBlocks(activity.description);
  const hasDescription = hasTripContent(activity.description);
  const mediaItems = useMemo(
    () => [
      ...activity.videos.map((video) => ({
        id: video.id,
        kind: "video" as const,
        mediaUrl: video.compressed_video_url ?? video.original_video_url,
        thumbnailUrl: video.thumbnail_url ?? video.tiny_thumbnail_url ?? "/default_map.jpg",
        alt: video.original_filename ?? activity.name,
      })),
      ...activity.photos.map((photo) => ({
        id: photo.id,
        kind: "photo" as const,
        mediaUrl: photo.image_url,
        thumbnailUrl: photo.thumbnail_url,
        alt: photo.original_filename ?? activity.name,
      })),
    ],
    [activity.name, activity.photos, activity.videos],
  );
  const mapMarkers = useMemo(
    () => [
      ...activity.videos.flatMap((video, index) =>
        video.gps_latitude === null || video.gps_longitude === null
          ? []
          : [
              {
                id: index,
                latitude: video.gps_latitude,
                longitude: video.gps_longitude,
                title: video.original_filename ?? activity.name,
                thumbnailUrl: video.tiny_thumbnail_url ?? video.thumbnail_url ?? "/default_map.jpg",
                accentColor: "#fef08a",
              },
            ],
      ),
      ...activity.photos.flatMap((photo, index) =>
        photo.gps_latitude === null || photo.gps_longitude === null
          ? []
          : [
              {
                id: activity.videos.length + index,
                latitude: photo.gps_latitude,
                longitude: photo.gps_longitude,
                title: photo.original_filename ?? activity.name,
                thumbnailUrl: photo.tiny_thumbnail_url ?? photo.thumbnail_url,
                accentColor: "white",
              },
            ],
      ),
    ],
    [activity.name, activity.photos, activity.videos],
  );

  const infoItems = [
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
      value:
        activity.moving_time != null
          ? `${Math.floor(activity.moving_time / 3600)}:${Math.floor(
              (activity.moving_time % 3600) / 60,
            )
              .toString()
              .padStart(2, "0")}`
          : dict.publicSite.metaEmpty,
    },
    {
      label: dict.activities.elapsedTime,
      value:
        activity.elapsed_time != null
          ? `${Math.floor(activity.elapsed_time / 3600)}:${Math.floor(
              (activity.elapsed_time % 3600) / 60,
            )
              .toString()
              .padStart(2, "0")}`
          : dict.publicSite.metaEmpty,
    },
    {
      label: dict.activities.totalElevationGain,
      value: activity.total_elevation_gain?.toLocaleString(locale) ?? dict.publicSite.metaEmpty,
    },
  ];
  const hasMedia = mediaItems.length > 0;
  const desktopGridClassName = hasMedia
    ? "lg:grid-cols-[26rem_minmax(0,1fr)] lg:grid-rows-[11rem_minmax(0,1fr)]"
    : "lg:grid-cols-[26rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]";
  const sidebarClassName = hasMedia
    ? "order-2 w-full min-w-0 bg-white/95 px-5 py-4 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.45)] backdrop-blur lg:order-1 lg:row-span-2 lg:min-h-0 lg:overflow-auto lg:border-r lg:border-stone-200"
    : "order-2 w-full min-w-0 bg-white/95 px-5 py-4 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.45)] backdrop-blur lg:order-1 lg:min-h-0 lg:overflow-auto lg:border-r lg:border-stone-200";

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-stone-200 lg:h-screen lg:overflow-hidden">
      <div className={`grid w-full min-w-0 gap-0 lg:h-full ${desktopGridClassName}`}>
        {hasMedia ? (
          <section className="order-1 w-full min-w-0 overflow-hidden border-b border-stone-200 bg-white/90 px-4 py-4 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.45)] backdrop-blur lg:order-2 lg:h-[11rem] lg:border-b lg:border-l">
            <ActivityMediaGallery
              items={mediaItems}
              layout="strip"
              onItemSelect={(index) => {
                setSelectedMediaIndex(index);
              }}
            />
          </section>
        ) : null}

        <section className={sidebarClassName}>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-stone-950">
              {activity.name}
            </h1>
            <Link
              aria-label="Home"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-stone-700 transition hover:bg-stone-100"
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
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {previousActivity ? (
              <Link
                className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                href={`/activities/${previousActivity.id}`}
              >
                {dict.activities.previousDay}
              </Link>
            ) : null}
            <Link
              className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              href={`/trips/${activity.trip_id}/map`}
            >
              {dict.activities.wholeMap}
            </Link>
            {nextActivity ? (
              <Link
                className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                href={`/activities/${nextActivity.id}`}
              >
                {dict.activities.nextDay}
              </Link>
            ) : null}
          </div>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

          <dl className="mt-5 space-y-4">
            {infoItems.map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm text-stone-700">{item.value}</dd>
              </div>
            ))}
          </dl>

          {hasDescription ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                {dict.activities.descriptionTitle}
              </p>
              <TripContentRenderer blocks={descriptionBlocks} className="mt-3" />
            </div>
          ) : null}

          <CommentsSection
            comments={comments}
            emptyText={dict.comments.emptyActivity}
            locale={locale}
            nameLabel={dict.comments.name}
            namePlaceholder={dict.comments.namePlaceholder}
            onCreate={async (payload) => {
              const created = await createPublicActivityComment(activity.id, payload);
              setComments((current) => [created, ...current]);
            }}
            submitLabel={dict.comments.submit}
            submittingLabel={dict.comments.submitting}
            textLabel={dict.comments.text}
            textPlaceholder={dict.comments.textPlaceholder}
            title={dict.comments.activityTitle}
            unknownError={dict.common.unknownError}
            validationError={dict.comments.validationError}
          />
        </section>

        <section className="order-3 w-full min-w-0 overflow-hidden bg-white/95 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.45)] backdrop-blur lg:order-3 lg:min-h-0 lg:h-full lg:border-l lg:border-t lg:border-stone-200">
          <div className="h-[calc(100vh-10rem)] w-full min-w-0 lg:h-full">
            <MapyMap
              polyline={activity.polyline ?? activity.summary_polyline}
              markers={mapMarkers}
              onMarkerClick={(markerId) => {
                setSelectedMediaIndex(Number(markerId));
              }}
              onError={(message) => {
                setError(message === "missing_api_key" ? dict.publicSite.mapMissingApiKey : null);
              }}
            />
          </div>
        </section>
      </div>

      <MediaLightbox
        items={mediaItems}
        onClose={() => {
          setSelectedMediaIndex(null);
        }}
        onSelect={setSelectedMediaIndex}
        selectedIndex={selectedMediaIndex}
      />
    </main>
  );
}
