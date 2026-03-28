"use client";

import { PublicFooter } from "@/components/public-footer";
import { TripContentRenderer } from "@/components/trip-content-renderer";
import { TripList } from "@/components/trip-list";
import { useI18n } from "@/components/i18n-provider";
import { getTripContentBlocks, hasTripContent } from "@/lib/blocknote";
import { getDateLocale } from "@/lib/i18n";
import { TripRead } from "@/lib/trips";

function formatDate(value: string | null, locale: "en" | "cs") {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(getDateLocale(locale), { dateStyle: "medium" }).format(new Date(value));
}

export function PublicTripPage({
  trip,
  trips,
}: {
  trip: TripRead;
  trips: TripRead[];
}) {
  const { dict, locale } = useI18n();
  const contentBlocks = getTripContentBlocks(trip.content);
  const tripHasContent = hasTripContent(trip.content);

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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f2e8_0%,#ffffff_28%,#ffffff_100%)] px-6 py-8 text-stone-900 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <section className="grid gap-8 rounded-[2rem] border border-stone-200 bg-white/90 px-8 py-12 shadow-[0_24px_80px_-48px_rgba(41,37,36,0.45)] backdrop-blur lg:grid-cols-[minmax(0,2fr)_20rem]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-stone-400">
              {dict.publicSite.tripEyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
              {trip.name || dict.publicSite.untitledTrip}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
              {dict.publicSite.tripTemplateDescription}
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-stone-50 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">
              {dict.publicSite.tripMetaTitle}
            </h2>
            <dl className="mt-4 space-y-4">
              {metaItems.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm text-stone-700">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {[dict.publicSite.sectionOne, dict.publicSite.sectionTwo].map((title) => (
            <div key={title} className="rounded-[2rem] border border-dashed border-stone-300 bg-stone-50 px-6 py-8">
              <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-500">{dict.publicSite.sectionPlaceholder}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-stone-900">{dict.publicSite.contentTitle}</h2>
            {tripHasContent ? (
              <div className="mt-4">
                <TripContentRenderer blocks={contentBlocks} editorKey={`trip-${trip.id}-content`} />
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-stone-50 px-4 py-5 text-sm leading-6 text-stone-500">
                {dict.publicSite.contentEmpty}
              </p>
            )}
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-stone-900">{dict.publicSite.technicalTitle}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                  {dict.publicSite.metricsConfig}
                </p>
                <pre className="mt-2 overflow-x-auto rounded-2xl bg-stone-100 p-4 text-xs leading-6 text-stone-700">
                  {JSON.stringify(trip.metrics_config, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                  {dict.publicSite.plannedPathPolyline}
                </p>
                <p className="mt-2 break-all rounded-2xl bg-stone-100 p-4 text-sm leading-6 text-stone-700">
                  {trip.planned_path_polyline ?? dict.publicSite.metaEmpty}
                </p>
              </div>
            </div>
          </div>
        </section>

        <TripList trips={trips} />
        <PublicFooter />
      </div>
    </main>
  );
}
