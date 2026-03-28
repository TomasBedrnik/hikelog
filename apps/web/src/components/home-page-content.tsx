"use client";

import { PublicFooter } from "@/components/public-footer";
import { useI18n } from "@/components/i18n-provider";

export function HomePageContent() {
  const { dict } = useI18n();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f4ec_0%,#ffffff_30%,#ffffff_100%)] px-6 py-8 text-stone-900 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-stone-200 bg-white/80 px-8 py-12 shadow-[0_24px_80px_-48px_rgba(41,37,36,0.45)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-stone-400">
            {dict.publicSite.homeEyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            {dict.publicSite.homeTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
            {dict.publicSite.homeDescription}
          </p>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="rounded-[2rem] border border-dashed border-stone-300 bg-stone-50 px-6 py-8"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-400">
                {dict.publicSite.templateSectionLabel}
              </p>
              <h2 className="mt-3 text-xl font-semibold text-stone-900">
                {dict.publicSite.templateSectionTitle} {index + 1}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-500">
                {dict.publicSite.templateSectionDescription}
              </p>
            </div>
          ))}
        </section>

        <PublicFooter />
      </div>
    </main>
  );
}
