"use client";

import { useEffect } from "react";
import { useI18n } from "@/components/i18n-provider";

export type ImageLightboxItem = {
  imageUrl: string;
  alt: string;
  label?: string | null;
};

export function ImageLightbox({
  items,
  selectedIndex,
  onClose,
  onSelect,
}: {
  items: ImageLightboxItem[];
  selectedIndex: number | null;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  const { dict } = useI18n();

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (items.length < 2) {
        return;
      }

      if (event.key === "ArrowLeft") {
        onSelect((selectedIndex - 1 + items.length) % items.length);
      }

      if (event.key === "ArrowRight") {
        onSelect((selectedIndex + 1) % items.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [items.length, onClose, onSelect, selectedIndex]);

  if (selectedIndex === null || !items[selectedIndex]) {
    return null;
  }

  const item = items[selectedIndex];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-stone-950/90 p-4"
      role="dialog"
      onClick={onClose}
    >
      <button
        aria-label={dict.common.close}
        className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        onClick={onClose}
        type="button"
      >
        {dict.common.close}
      </button>

      {items.length > 1 ? (
        <button
          aria-label={dict.common.previous}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white transition hover:bg-white/20"
          onClick={(event) => {
            event.stopPropagation();
            onSelect((selectedIndex - 1 + items.length) % items.length);
          }}
          type="button"
        >
          ‹
        </button>
      ) : null}

      <div
        className="flex max-h-full max-w-6xl flex-col items-center gap-4"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={item.alt}
          className="max-h-[calc(100vh-7rem)] max-w-full rounded-[1.5rem] object-contain shadow-[0_30px_100px_-40px_rgba(0,0,0,0.85)]"
          src={item.imageUrl}
        />
        {item.label ? (
          <p className="max-w-3xl text-center text-sm text-stone-200">{item.label}</p>
        ) : null}
      </div>

      {items.length > 1 ? (
        <button
          aria-label={dict.common.next}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white transition hover:bg-white/20"
          onClick={(event) => {
            event.stopPropagation();
            onSelect((selectedIndex + 1) % items.length);
          }}
          type="button"
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
