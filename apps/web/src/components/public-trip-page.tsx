"use client";

import { PublicFooter } from "@/components/public-footer";
import { ActivityPhotoGallery } from "@/components/activity-photo-gallery";
import { TripContentRenderer } from "@/components/trip-content-renderer";
import { TripList } from "@/components/trip-list";
import { useI18n } from "@/components/i18n-provider";
import { getTripContentBlocks, hasTripContent } from "@/lib/blocknote";
import { getDateLocale } from "@/lib/i18n";
import { ActivitySummaryRead, sortActivitiesByStartDate } from "@/lib/activities";
import { TripRead } from "@/lib/trips";
import Link from "next/link";

function formatDate(value: string | null, locale: "en" | "cs") {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(getDateLocale(locale), { dateStyle: "medium" }).format(new Date(value));
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
  const contentBlocks = getTripContentBlocks(trip.content);
  const tripHasContent = hasTripContent(trip.content);
  const sortedActivities = sortActivitiesByStartDate(activities);
  const heroImageUrl = trip.images[0]?.image_url ?? "/home-hero-theme.png";
  const activityPhotoItems = sortedActivities.flatMap((activity) =>
    activity.photos.map((photo) => ({
      id: photo.id,
      imageUrl: photo.image_url,
      thumbnailUrl: photo.thumbnail_url,
      alt: photo.original_filename ?? activity.name,
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
      label: dict.publicSite.timezone,
      value: trip.timezone ?? dict.publicSite.metaEmpty,
    },
    {
      label: dict.publicSite.countries,
      value: trip.country_codes.length > 0 ? trip.country_codes.join(", ") : dict.publicSite.metaEmpty,
    },
    {
      label: dict.publicSite.plannedDistance,
      value: trip.planned_distance_m !== null ? trip.planned_distance_m.toLocaleString(locale) : dict.publicSite.metaEmpty,
    },
    {
      label: dict.publicSite.showPlannedPath,
      value: trip.show_planned_path ? dict.publicSite.yes : dict.publicSite.no,
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
          <div className="absolute inset-0 bg-[linear-gradient(270deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.08)_34%,rgba(245,239,227,0.72)_66%,rgba(245,239,227,0.94)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.62),transparent_36%),radial-gradient(circle_at_bottom,rgba(116,92,54,0.12),transparent_45%)]" />

          <div className="relative px-8 py-12 sm:px-10 lg:px-12">
            <div className="flex justify-end">
              <Link
                className="rounded-full border border-stone-300/80 bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 shadow-[0_18px_40px_-28px_rgba(41,37,36,0.7)] backdrop-blur transition hover:bg-white"
                href={`/trips/${trip.id}/map`}
              >
                {dict.publicSite.openMap}
              </Link>
            </div>

            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-stone-500">
                {dict.publicSite.tripEyebrow}
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                {trip.name || dict.publicSite.untitledTrip}
              </h1>

              {tripHasContent ? (
                <div className="mt-5 max-w-2xl">
                  <TripContentRenderer blocks={contentBlocks} className="text-stone-700" />
                </div>
              ) : (
                <p className="mt-5 max-w-2xl text-sm leading-6 text-stone-600">{dict.publicSite.contentEmpty}</p>
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
              <p className="mt-4 rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">{dict.activities.emptyPublic}</p>
          ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {sortedActivities.map((activity) => (
                    <Link
                        key={activity.id}
                        className="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-5 py-4 transition hover:border-emerald-600 hover:bg-emerald-50"
                        href={`/activities/${activity.id}`}
                    >
                      <p className="text-lg font-semibold text-stone-900">{activity.name}</p>
                      <p className="mt-2 text-sm text-stone-600">
                        {activity.sport_type ?? activity.type ?? dict.publicSite.metaEmpty}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-400">
                        {activity.start_date
                            ? new Intl.DateTimeFormat(getDateLocale(locale), { dateStyle: "medium", timeStyle: "short" }).format(
                                new Date(activity.start_date),
                            )
                            : dict.publicSite.metaEmpty}
                      </p>
                    </Link>
                ))}
              </div>
          )}
        </section>

        <section className="mt-10 rounded-[2rem] border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-stone-900">{dict.activityPhotos.tripTitle}</h2>
            <span className="text-sm text-stone-500">{activityPhotoItems.length}</span>
          </div>

          {activityPhotoItems.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">
              {dict.activityPhotos.emptyTrip}
            </p>
          ) : (
            <div className="mt-5">
              <ActivityPhotoGallery items={activityPhotoItems} layout="grid" />
            </div>
          )}
        </section>

        <TripList trips={trips} />
        <PublicFooter />
      </div>
    </main>
  );
}
