"use client";

import Link from "next/link";

export type ActivityPhotoGalleryItem = {
  id: number;
  imageUrl: string;
  thumbnailUrl: string;
  alt: string;
  href?: string;
  label?: string | null;
};

export function ActivityPhotoGallery({
  items,
  layout,
}: {
  items: ActivityPhotoGalleryItem[];
  layout: "grid" | "strip";
}) {
  if (items.length === 0) {
    return null;
  }

  if (layout === "strip") {
    return (
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-3">
          {items.map((item) => {
            const content = (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={item.alt}
                  className="h-32 w-48 rounded-[1.25rem] bg-stone-200 object-cover shadow-sm"
                  loading="lazy"
                  src={item.thumbnailUrl}
                />
                {item.label ? <p className="mt-2 max-w-48 truncate text-xs text-stone-600">{item.label}</p> : null}
              </>
            );

            return item.href ? (
              <Link key={item.id} className="block" href={item.href}>
                {content}
              </Link>
            ) : (
              <a key={item.id} className="block" href={item.imageUrl} rel="noreferrer" target="_blank">
                {content}
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const content = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={item.alt}
              className="h-52 w-full bg-stone-200 object-cover"
              loading="lazy"
              src={item.thumbnailUrl}
            />
            {item.label ? <p className="truncate px-4 py-3 text-sm text-stone-700">{item.label}</p> : null}
          </>
        );

        return item.href ? (
          <Link
            key={item.id}
            className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white transition hover:border-emerald-600 hover:bg-emerald-50"
            href={item.href}
          >
            {content}
          </Link>
        ) : (
          <a
            key={item.id}
            className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white"
            href={item.imageUrl}
            rel="noreferrer"
            target="_blank"
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}
