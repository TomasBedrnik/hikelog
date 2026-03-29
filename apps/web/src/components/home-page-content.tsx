"use client";

import Image from "next/image";
import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { useI18n } from "@/components/i18n-provider";

export function HomePageContent() {
  const { dict } = useI18n();
  const featureCards = [
    {
      title: dict.publicSite.homeFeatureTitleOne,
      text: dict.publicSite.homeFeatureTextOne,
      rotation: "-rotate-2",
    },
    {
      title: dict.publicSite.homeFeatureTitleTwo,
      text: dict.publicSite.homeFeatureTextTwo,
      rotation: "rotate-1",
    },
    {
      title: dict.publicSite.homeFeatureTitleThree,
      text: dict.publicSite.homeFeatureTextThree,
      rotation: "-rotate-1",
    },
  ];
  const tripCards = [
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

  return (
    <main className="
          min-h-screen
          bg-[#ece3cf]
          bg-[url('/topo_seamless_contours.svg')]
          bg-repeat
          bg-[length:3000px_3000px]
          bg-[position:0_0]
          px-5 py-6
          text-stone-900
          sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-stone-300/70 shadow-[0_30px_120px_-60px_rgba(55,43,23,0.55)]">
          <div className="absolute inset-0 bg-[url('/home-hero-theme.png')] bg-cover bg-[left_center]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.08)_34%,rgba(245,239,227,0.72)_66%,rgba(245,239,227,0.94)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.62),transparent_36%),radial-gradient(circle_at_bottom,rgba(116,92,54,0.12),transparent_45%)]" />

          <div className="relative px-6 py-6 sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-stone-700">
              <p className="font-semibold uppercase tracking-[0.35em] text-stone-500">{dict.publicSite.homeEyebrow}</p>
              <nav className="flex flex-wrap gap-5 text-sm text-stone-700/85">
                <span>{dict.publicSite.homeNavAbout}</span>
                <span>{dict.publicSite.homeNavTalks}</span>
                <span>{dict.publicSite.homeNavTrips}</span>
                <span>{dict.publicSite.homeNavMedia}</span>
                <span>{dict.publicSite.homeNavContact}</span>
              </nav>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)] lg:items-end">
              <div className="hidden lg:block" />
              <div className="pb-2 lg:justify-self-end lg:text-left">
                <h1 className="max-w-3xl font-serif text-5xl italic leading-[0.95] text-stone-900 sm:text-6xl lg:text-7xl">
                  {dict.publicSite.homeTitle}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
                  {dict.publicSite.homeDescription}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    className="rounded-full bg-[#8c6f3e] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_-18px_rgba(80,60,25,0.85)] transition hover:bg-[#755b33]"
                    href="/trips"
                  >
                    {dict.publicSite.homePrimaryCta}
                  </Link>
                  <Link
                    className="rounded-full border border-stone-400/70 bg-white/60 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:bg-white/85"
                    href="/admin"
                  >
                    {dict.publicSite.homeSecondaryCta}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-stone-400/40" />
            <p className="font-serif text-3xl italic text-stone-800">{dict.publicSite.homeTripsEyebrow}</p>
            <div className="h-px flex-1 bg-stone-400/40" />
          </div>
          <h2 className="mx-auto mt-4 max-w-3xl text-center text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            {dict.publicSite.homeTripsTitle}
          </h2>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {tripCards.map((card) => (
              <article
                key={card.title}
                className="overflow-hidden rounded-[1.6rem] border border-stone-300/80 bg-[#f9f5ec] shadow-[0_28px_70px_-50px_rgba(41,37,36,0.8)]"
              >
                <div className="m-3 overflow-hidden rounded-[1rem] border-4 border-white bg-stone-200">
                  <Image
                    alt={card.title}
                    className={`h-52 w-full object-cover ${card.objectPosition}`}
                    height={320}
                    src="/home-hero-theme.png"
                    width={520}
                  />
                </div>
                <div className="px-5 pb-5 pt-1">
                  <h3 className="font-serif text-2xl italic text-stone-900">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{card.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-[2rem] bg-[linear-gradient(180deg,rgba(139,113,67,0.12),rgba(139,113,67,0.02))] px-6 py-10 text-center">
          <p className="mx-auto max-w-4xl font-serif text-2xl italic leading-9 text-stone-800 sm:text-3xl">
            {dict.publicSite.homeQuote}
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              className="rounded-full bg-[#c88b3d] px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_30px_-18px_rgba(123,76,22,0.9)] transition hover:bg-[#b67a30]"
              href="/trips"
            >
              {dict.publicSite.homePrimaryCta}
            </Link>
          </div>
        </section>

        <PublicFooter />
      </div>
    </main>
  );
}
