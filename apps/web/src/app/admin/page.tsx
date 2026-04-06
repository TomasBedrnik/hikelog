"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

export default function AdminPage() {
  const { dict } = useI18n();
  const sections = [
    {
      href: "/admin/users",
      title: dict.adminHome.usersTitle,
      description: dict.adminHome.usersDescription,
    },
    {
      href: "/admin/site",
      title: dict.adminHome.siteTitle,
      description: dict.adminHome.siteDescription,
    },
    {
      href: "/admin/trips",
      title: dict.adminHome.tripsTitle,
      description: dict.adminHome.tripsDescription,
    },
    {
      href: "/admin/activities",
      title: dict.adminHome.activitiesTitle,
      description: dict.adminHome.activitiesDescription,
    },
    {
      href: "/admin/strava",
      title: dict.adminHome.stravaTitle,
      description: dict.adminHome.stravaDescription,
    },
    {
      href: "/admin/webpushr",
      title: dict.adminHome.webpushrTitle,
      description: dict.adminHome.webpushrDescription,
    },
    {
      href: "/admin/gallery",
      title: dict.adminHome.galleryTitle,
      description: dict.adminHome.galleryDescription,
    },
  ];

  return (
    <div className="mx-auto mt-6 max-w-5xl border-t border-stone-300 pt-6">
      <h1 className="text-4xl font-semibold tracking-tight">{dict.adminHome.title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-stone-600">{dict.adminHome.subtitle}</p>

      <div className="mt-8 divide-y border-y border-stone-200">
        {sections.map((section) => (
          <Link
            key={section.href}
            className="block px-1 py-5 transition hover:bg-stone-50"
            href={section.href}
          >
            <div className="text-xl font-semibold">{section.title}</div>
            <p className="mt-2 text-sm text-stone-600">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
