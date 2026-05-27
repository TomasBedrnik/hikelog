"use client";

import Image from "next/image";
import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { TripContentRenderer } from "@/components/trip-content-renderer";
import { useI18n } from "@/components/i18n-provider";
import { getTripContentBlocks } from "@/lib/blocknote";
import { GlobalContentRead } from "@/lib/global-content";
import { getDateLocale, normalizeEnabledLocales } from "@/lib/i18n";
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

export function HomePageContent({
  trips,
  globalContent,
}: {
  trips: TripRead[];
  globalContent: GlobalContentRead | null;
}) {
  const { dict, locale } = useI18n();
  const heroImageUrl = globalContent?.hero_image_url ?? "/home-hero-theme.png";
  const heroHeadline = globalContent?.main_headline?.trim() || dict.publicSite.homeTitle;
  const heroBlocks = getTripContentBlocks(globalContent?.home_content ?? null);
  const enabledLocales = normalizeEnabledLocales(globalContent?.enabled_language_codes);
  const hasGlobalHeroContent = globalContent?.home_content != null;
  const fallbackTripCards = [
    {
      title: dict.publicSite.homeTripOne,
      text: dict.publicSite.homeTripOneMeta,
      objectPosition: "object-[center_40%]",
    },
    {
      title: dict.publicSite.homeTripTwo,
      text: dict.publicSite.homeTripTwoMeta,
      objectPosition: "object-center",
    },
    {
      title: dict.publicSite.homeTripThree,
      text: dict.publicSite.homeTripThreeMeta,
      objectPosition: "object-[center_55%]",
    },
  ];
  const tripCards =
    trips.length > 0
      ? trips.map((trip, index) => ({
          id: trip.id,
          href: `/trips/${trip.id}`,
          title: trip.name || dict.publicSite.untitledTrip,
          text: formatTripDates(trip, locale) ?? dict.publicSite.noTripDates,
          imageUrl: trip.images[0]?.image_url ?? "/home-hero-theme.png",
          objectPosition: index === 1 ? "object-center" : "object-[center_45%]",
        }))
      : fallbackTripCards.map((card, index) => ({
          id: index,
          href: "/",
          title: card.title,
          text: card.text,
          imageUrl: "/home-hero-theme.png",
          objectPosition: card.objectPosition,
        }));

  return (
    <main className="min-h-screen bg-[#ece3cf] bg-[url('/topo_seamless_contours.svg')] bg-repeat bg-[length:3000px_3000px] bg-[position:0_0] px-5 py-6 text-stone-900 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-stone-300/70 shadow-[0_30px_120px_-60px_rgba(55,43,23,0.55)]">
          <div
            className="absolute inset-0 bg-cover bg-[left_center]"
            style={{ backgroundImage: `url('${heroImageUrl}')` }}
          />
          <div className="absolute inset-0 hidden lg:block bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.08)_34%,rgba(245,239,227,0.72)_66%,rgba(245,239,227,0.94)_100%)]" />
          <div className="absolute inset-0 hidden lg:block bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.62),transparent_36%),radial-gradient(circle_at_bottom,rgba(116,92,54,0.12),transparent_45%)]" />

          <div className="absolute inset-0 lg:hidden block bg-[rgba(255,255,255,0.8)]" />

          <div className="relative pr-6 pb-6 sm:pr-6 lg:pb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-stone-700">
              <div className="relative flex items-center gap-3 text-lg font-bold tracking-[0.18em] text-[#035E24] sm:text-2xl  p-6">
                <div className="pointer-events-none absolute inset-0 bg-[rgba(255,255,255,0.7)] blur-xl"></div>
                <Image
                  alt=""
                  className="size-8 rounded-md z-2"
                  height={32}
                  src="/favicon-32x32.png"
                  width={32}
                />
                <h1 className="z-2">Zuzka jde...</h1>
              </div>
              {/*<nav className="flex flex-wrap gap-5 text-sm text-stone-700/85">*/}
              {/*  <span>{dict.publicSite.homeNavAbout}</span>*/}
              {/*  <span>{dict.publicSite.homeNavTalks}</span>*/}
              {/*  <span>{dict.publicSite.homeNavTrips}</span>*/}
              {/*  <span>{dict.publicSite.homeNavMedia}</span>*/}
              {/*  <span>{dict.publicSite.homeNavContact}</span>*/}
              {/*</nav>*/}
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)] lg:items-end">
              <div className="hidden lg:block" />
              <div className="pl-6 lg:pl-0 pb-2 lg:justify-self-end lg:text-left">
                <h2 className="max-w-3xl text-5xl font-bold leading-[0.95] text-stone-900 sm:text-6xl lg:text-7xl">
                  {heroHeadline}
                </h2>
                {hasGlobalHeroContent ? (
                  <TripContentRenderer
                    blocks={heroBlocks}
                    className="mt-5 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg"
                  />
                ) : (
                  <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
                    {dict.publicSite.homeDescription}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {tripCards.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className="overflow-hidden rounded-[1.6rem] border border-stone-300/80 bg-[#f9f5ec] shadow-[0_28px_70px_-50px_rgba(41,37,36,0.8)]"
              >
                <div className="m-3 overflow-hidden rounded-[1rem] border-4 border-white bg-stone-200">
                  <Image
                    alt={card.title}
                    className={`h-52 w-full object-cover ${card.objectPosition}`}
                    height={320}
                    src={card.imageUrl}
                    width={520}
                  />
                </div>
                <div className="px-5 pb-5 pt-1">
                  <h3 className="text-2xl text-bold text-stone-900">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{card.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <PublicFooter enabledLocales={enabledLocales} />
      </div>
    </main>
  );
}
