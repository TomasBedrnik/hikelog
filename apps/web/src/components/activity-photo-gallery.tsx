"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n-provider";

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
  onItemSelect,
}: {
  items: ActivityPhotoGalleryItem[];
  layout: "grid" | "strip";
  onItemSelect?: (index: number) => void;
}) {
  const { dict } = useI18n();
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = stripRef.current;
    if (!el) {
      setIsScrollable(false);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;

    setIsScrollable(hasOverflow);
    setCanScrollLeft(hasOverflow && el.scrollLeft > 1);
    setCanScrollRight(hasOverflow && el.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    updateScrollState();

    const el = stripRef.current;
    if (!el) {
      return;
    }

    const onScroll = () => {
      updateScrollState();
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });

    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    };
  }, [items, layout, updateScrollState]);

  const scrollStripBy = (direction: -1 | 1) => {
    const el = stripRef.current;
    if (!el) {
      return;
    }

    const delta = Math.max(el.clientWidth * 0.75, 220) * direction;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (items.length === 0) {
    return null;
  }

  if (layout === "strip") {
    return (
      <div className="relative min-w-0 max-w-full">
        {isScrollable ? (
          <>
            <button
              aria-label="Scroll photos left"
              className="absolute left-2 top-1/2 z-10 -translate-y-[calc(50%+5px)] rounded-full border border-stone-200 bg-white/95 px-2.5 py-2 text-stone-700 shadow-sm transition hover:bg-white disabled:cursor-default disabled:opacity-35"
              disabled={!canScrollLeft}
              onClick={() => {
                scrollStripBy(-1);
              }}
              type="button"
            >
              <Image
                alt=""
                aria-hidden="true"
                height={32}
                src="/icons/chevron_left.svg"
                width={32}
              />
            </button>
            <button
              aria-label="Scroll photos right"
              className="absolute right-2 top-1/2 z-10 -translate-y-[calc(50%+5px)] rounded-full border border-stone-200 bg-white/95 px-2.5 py-2 text-stone-700 shadow-sm transition hover:bg-white disabled:cursor-default disabled:opacity-35"
              disabled={!canScrollRight}
              onClick={() => {
                scrollStripBy(1);
              }}
              type="button"
            >
              <Image
                alt=""
                aria-hidden="true"
                height={32}
                src="/icons/chevron_right.svg"
                width={32}
              />
            </button>
          </>
        ) : null}

        <div className="min-w-0 max-w-full overflow-x-auto" ref={stripRef}>
          <div className={`flex min-w-max gap-3`}>
            {items.map((item, index) => {
              const content = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={item.alt}
                    className="h-32 w-48 rounded-[1.25rem] bg-stone-200 object-cover shadow-sm"
                    loading="lazy"
                    src={item.thumbnailUrl}
                  />
                  {item.label ? (
                    <p className="mt-2 max-w-48 truncate text-xs text-stone-600">{item.label}</p>
                  ) : null}
                </>
              );

              return item.href ? (
                <Link key={item.id} className="block" href={item.href}>
                  {content}
                </Link>
              ) : onItemSelect ? (
                <button
                  key={item.id}
                  className="block text-left cursor-pointer"
                  onClick={() => {
                    onItemSelect(index);
                  }}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <a
                  key={item.id}
                  className="block"
                  href={item.imageUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {content}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        const imageContent = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={item.alt}
              className="h-52 w-full bg-stone-200 object-cover"
              loading="lazy"
              src={item.thumbnailUrl}
            />
          </>
        );

        if (onItemSelect && item.href) {
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white transition hover:border-emerald-600 hover:bg-emerald-50"
            >
              <button
                className="block w-full text-left"
                onClick={() => {
                  onItemSelect(index);
                }}
                type="button"
              >
                {imageContent}
              </button>
              {item.label ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="min-w-0 truncate text-sm text-stone-700">{item.label}</p>
                  <Link
                    className="shrink-0 text-sm font-medium text-emerald-700 transition hover:text-emerald-900"
                    href={item.href}
                  >
                    {dict.publicSite.openTrip}
                  </Link>
                </div>
              ) : null}
            </div>
          );
        }

        const content = (
          <>
            {imageContent}
            {item.label ? (
              <p className="truncate px-4 py-3 text-sm text-stone-700">{item.label}</p>
            ) : null}
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
        ) : onItemSelect ? (
          <button
            key={item.id}
            className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white text-left transition hover:border-emerald-600 hover:bg-emerald-50"
            onClick={() => {
              onItemSelect(index);
            }}
            type="button"
          >
            {content}
          </button>
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
