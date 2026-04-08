"use client";

import { useState } from "react";
import { PublicFooter } from "@/components/public-footer";
import { ActivityPhotoGallery } from "@/components/activity-photo-gallery";
import { CommentsSection } from "@/components/comments-section";
import { TripContentRenderer } from "@/components/trip-content-renderer";
import { TripList } from "@/components/trip-list";
import { ImageLightbox } from "@/components/image-lightbox";
import { useI18n } from "@/components/i18n-provider";
import { getTripContentBlocks, hasTripContent } from "@/lib/blocknote";
import { getDateLocale } from "@/lib/i18n";
import { ActivitySummaryRead, sortActivitiesByStartDate } from "@/lib/activities";
import { createPublicTripComment } from "@/lib/comments";
import { TripRead } from "@/lib/trips";
import Link from "next/link";
import Image from "next/image";

function formatDate(value: string | null, locale: "en" | "cs") {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(getDateLocale(locale), { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatNumber(
  value: number | null,
  locale: "en" | "cs",
  options?: Intl.NumberFormatOptions,
) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return new Intl.NumberFormat(getDateLocale(locale), options).format(value);
}

export function PublicTripPage({
  trip,
  trips,
  activities,
}: {
  trip: TripRead;
  trips: TripRead[];
  activities: ActivitySummaryRead[];
}) {
  const { dict, locale } = useI18n();
  const [comments, setComments] = useState(trip.comments);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const contentBlocks = getTripContentBlocks(trip.content);
  const tripHasContent = hasTripContent(trip.content);
  const sortedActivities = sortActivitiesByStartDate(activities);
  const heroImageUrl = trip.images[0]?.image_url ?? "/home-hero-theme.png";
  const mapCardImageUrl = trip.map_card_image_url ?? "/default_map.jpg";
  const totalDistanceMeters = activities.reduce(
    (sum, activity) => sum + (activity.distance ?? 0),
    0,
  );
  const totalMovingTimeSeconds = activities.reduce(
    (sum, activity) => sum + (activity.moving_time ?? 0),
    0,
  );
  const totalElevationGainMeters = activities.reduce(
    (sum, activity) => sum + (activity.total_elevation_gain ?? 0),
    0,
  );
  const totalDistanceKm = totalDistanceMeters > 0 ? totalDistanceMeters / 1000 : null;
  const totalMovingHours = totalMovingTimeSeconds > 0 ? totalMovingTimeSeconds / 3600 : null;
  const totalTripDays = activities.length > 0 ? activities.length : null;
  const activityPhotoItems = sortedActivities.flatMap((activity) =>
      activity.photos.map((photo) => ({
        id: photo.id,
        imageUrl: photo.image_url,
        thumbnailUrl: photo.thumbnail_url,
        alt: photo.original_filename ?? activity.name,
        label: activity.name,
        href: `/activities/${activity.id}`,
      })),
  );

  const metaItems = [
    {
      label: dict.publicSite.startDate,
      value: formatDate(trip.start_date, locale) ?? dict.publicSite.metaEmpty,
    },
    {
      label: dict.publicSite.endDate,
      value: formatDate(trip.end_date, locale) ?? dict.publicSite.metaEmpty,
    },
    {
      label: dict.publicSite.walkedDistance,
      value:
        totalDistanceKm === null
          ? dict.publicSite.metaEmpty
          : `${formatNumber(totalDistanceKm, locale, { maximumFractionDigits: 1 })} km`,
    },
    {
      label: dict.publicSite.walkedTime,
      value:
        totalMovingHours === null
          ? dict.publicSite.metaEmpty
          : `${formatNumber(totalMovingHours, locale, { maximumFractionDigits: 1 })} h`,
    },
    {
      label: dict.publicSite.tripDays,
      value:
        totalTripDays === null ? dict.publicSite.metaEmpty : formatNumber(totalTripDays, locale),
    },
    {
      label: dict.publicSite.elevationGain,
      value:
        totalElevationGainMeters === null
          ? dict.publicSite.metaEmpty
          : `${formatNumber(totalElevationGainMeters, locale, { maximumFractionDigits: 0 })} m`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#ece3cf] bg-[url('/topo_seamless_contours.svg')] bg-[length:3000px_3000px] bg-[position:0_0] bg-repeat px-6 py-8 text-stone-900 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-stone-300/70 shadow-[0_30px_120px_-60px_rgba(55,43,23,0.55)]">
          <div
            className="absolute inset-0 bg-cover bg-[right_center]"
            style={{ backgroundImage: `url('${heroImageUrl}')` }}
          />
          <Link
            href="/"
            className="absolute left-0 top-0 flex items-center gap-3 text-lg font-bold tracking-[0.18em] text-[#035E24] sm:text-2xl  p-6"
          >
            <div className="pointer-events-none absolute inset-0 bg-[rgba(255,255,255,0.7)] blur-xl"></div>
            <Image
              alt=""
              className="size-8 rounded-md z-2"
              height={32}
              src="/favicon-32x32.png"
              width={32}
            />
            <h1 className="z-2">Zuzka jde...</h1>
          </Link>
          <div className="absolute inset-0 hidden lg:block bg-[linear-gradient(270deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.08)_34%,rgba(245,239,227,0.72)_66%,rgba(245,239,227,0.94)_100%)]" />
          <div className="absolute inset-0 hidden lg:block bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.62),transparent_36%),radial-gradient(circle_at_bottom,rgba(116,92,54,0.12),transparent_45%)]" />

          <div className="absolute inset-0 lg:hidden block bg-[rgba(255,255,255,0.8)]" />

          <div className="relative px-8 pb-12 pt-20 sm:px-10 lg:px-12 sm:pt-10 lg:pt-12">
            <div className="flex justify-end">
              <Link
                className="group relative overflow-hidden rounded-[1.75rem] border border-stone-300/80 bg-[#f4efe3] shadow-[0_24px_60px_-40px_rgba(41,37,36,0.65)] transition hover:shadow-[0_28px_70px_-40px_rgba(41,37,36,0.8)]"
                href={`/trips/${trip.id}/map`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url('${mapCardImageUrl}')` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(3,94,36,0.8),rgba(3,94,36,0.62)_45%,rgba(3,94,36,0.52)_100%)]" />
                <div className="relative flex items-center justify-center min-h-28 sm:min-h-36 lg:min-h-44 p-6 min-w-72 sm:min-w-80">
                  <span className="max-w-44 text-2xl lg:text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:max-w-52">
                    {dict.publicSite.mapWithRoute}
                  </span>
                </div>
              </Link>
            </div>

            <div className="max-w-3xl">
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                {trip.name || dict.publicSite.untitledTrip}
              </h1>

              {tripHasContent ? (
                <div className="mt-5 max-w-2xl">
                  <TripContentRenderer blocks={contentBlocks} className="text-stone-700" />
                </div>
              ) : (
                <p className="mt-5 max-w-2xl text-sm leading-6 text-stone-600">
                  {dict.publicSite.contentEmpty}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-[0_24px_80px_-48px_rgba(41,37,36,0.45)] backdrop-blur">
          <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {metaItems.map((item) => (
              <div key={item.label} className="rounded-[1.25rem] bg-stone-50 px-5 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm text-stone-700">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10 rounded-[2rem] border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-stone-900">{dict.activities.publicTitle}</h2>
            <span className="text-sm text-stone-500">{activities.length}</span>
          </div>

          {activities.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">
              {dict.activities.emptyPublic}
            </p>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {sortedActivities.map((activity) => (
                <Link
                  key={activity.id}
                  className="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-5 py-4 transition hover:border-emerald-600 hover:bg-emerald-50"
                  href={`/activities/${activity.id}`}
                >
                  <p className="text-lg font-semibold text-stone-900">{activity.name}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-400">
                    {activity.start_date
                      ? new Intl.DateTimeFormat(getDateLocale(locale), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(activity.start_date))
                      : dict.publicSite.metaEmpty}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <CommentsSection
          comments={comments}
          emptyText={dict.comments.emptyTrip}
          locale={locale}
          nameLabel={dict.comments.name}
          namePlaceholder={dict.comments.namePlaceholder}
          onCreate={async (payload) => {
            const created = await createPublicTripComment(trip.id, payload);
            setComments((current) => [created, ...current]);
          }}
          submitLabel={dict.comments.submit}
          submittingLabel={dict.comments.submitting}
          textLabel={dict.comments.text}
          textPlaceholder={dict.comments.textPlaceholder}
          title={dict.comments.tripTitle}
          unknownError={dict.common.unknownError}
          validationError={dict.comments.validationError}
        />

        <section className="mt-10 rounded-[2rem] border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-stone-900">
              {dict.activityPhotos.tripTitle}
            </h2>
            <span className="text-sm text-stone-500">{activityPhotoItems.length}</span>
          </div>

          {activityPhotoItems.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">
              {dict.activityPhotos.emptyTrip}
            </p>
          ) : (
            <div className="mt-5">
              <ActivityPhotoGallery
                items={activityPhotoItems}
                layout="grid"
                onItemSelect={setSelectedPhotoIndex}
              />
            </div>
          )}
        </section>

        <TripList trips={trips} />
        <PublicFooter />
      </div>

      <ImageLightbox
        items={activityPhotoItems}
        onClose={() => {
          setSelectedPhotoIndex(null);
        }}
        onSelect={setSelectedPhotoIndex}
        selectedIndex={selectedPhotoIndex}
      />
    </main>
  );
}
