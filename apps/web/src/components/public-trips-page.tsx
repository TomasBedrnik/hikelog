"use client";

import { PublicFooter } from "@/components/public-footer";
import { TripList } from "@/components/trip-list";
import { useI18n } from "@/components/i18n-provider";
import { TripRead } from "@/lib/trips";

export function PublicTripsPage({ trips }: { trips: TripRead[] }) {
  const { dict } = useI18n();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f2e8_0%,#ffffff_28%,#ffffff_100%)] px-6 py-8 text-stone-900 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-stone-200 bg-white/90 px-8 py-12 shadow-[0_24px_80px_-48px_rgba(41,37,36,0.45)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-stone-400">
            {dict.publicSite.tripListEyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            {dict.publicSite.tripListPageTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
            {dict.publicSite.tripListPageDescription}
          </p>
        </section>

        <TripList trips={trips} />
        <PublicFooter />
      </div>
    </main>
  );
}
