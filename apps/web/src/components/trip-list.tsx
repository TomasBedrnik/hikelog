"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { getDateLocale } from "@/lib/i18n";
import { TripRead } from "@/lib/trips";

function formatTripDates(trip: TripRead, locale: "en" | "cs") {
  if (!trip.start_date && !trip.end_date) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat(getDateLocale(locale), {
    dateStyle: "medium",
  });

  const start = trip.start_date ? formatter.format(new Date(trip.start_date)) : null;
  const end = trip.end_date ? formatter.format(new Date(trip.end_date)) : null;

  return [start, end].filter(Boolean).join(" - ");
}

export function TripList({ trips }: { trips: TripRead[] }) {
  const { dict, locale } = useI18n();

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">
            {dict.publicSite.tripListTitle}
          </h2>
        </div>
        <p className="text-sm text-stone-500">{trips.length}</p>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-sm text-stone-500">
          {dict.publicSite.emptyTrips}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trips.map((trip) => {
            const dates = formatTripDates(trip, locale);

            return (
              <Link
                key={trip.id}
                className="group rounded-3xl border border-stone-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-stone-900"
                href={`/trips/${trip.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">
                      {trip.name || dict.publicSite.untitledTrip}
                    </h3>
                    <p className="mt-2 text-sm text-stone-500">
                      {dates ?? dict.publicSite.noTripDates}
                    </p>
                  </div>
                  <span className="text-sm text-stone-400 transition group-hover:text-stone-900">
                    {dict.publicSite.openTrip}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
