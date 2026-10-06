"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import type { ProductImage } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/**
 * Native scroll-snap carousel: swipe on touch, arrows and thumbnails on desktop.
 * One DOM for every screen size, so only the first image is loaded eagerly.
 */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  const goTo = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }, []);

  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/5] place-items-center bg-sand">
        <LogoMark className="h-16 opacity-60" />
      </div>
    );
  }

  const multiple = images.length > 1;

  return (
    // The thumbnail column only exists when there is more than one photo. With one photo the main image
    // must fill the whole width, not slide into the narrow thumbnail column.
    <div className={cn(multiple && "lg:grid lg:grid-cols-[4.5rem_1fr] lg:gap-4")}>
      {multiple && (
        <ul className="hidden flex-col gap-3 lg:flex" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === active}
                className={cn(
                  "relative block aspect-[4/5] w-full overflow-hidden bg-sand outline-offset-2 transition-opacity duration-200",
                  i === active ? "ring-1 ring-gold" : "opacity-60 hover:opacity-100",
                )}
              >
                <Image src={img.url} alt="" fill sizes="72px" quality={60} className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="group relative">
        <ul
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== active) setActive(i);
          }}
          className="flex snap-x snap-mandatory overflow-x-auto bg-sand [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-roledescription="carousel"
          aria-label={`${name} images`}
        >
          {images.map((img, i) => (
            <li
              key={img.url}
              className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${images.length}`}
            >
              <Image
                src={img.url}
                alt={img.alt || `${name}, image ${i + 1}`}
                fill
                sizes="(min-width: 1024px) 48vw, 100vw"
                quality={85}
                priority={i === 0}
                className="object-cover transition-transform duration-700 ease-(--ease-out) [@media(hover:hover)]:hover:scale-[1.06]"
              />
            </li>
          ))}
        </ul>

        {multiple && (
          <>
            <button
              type="button"
              onClick={() => goTo(Math.max(0, active - 1))}
              aria-label="Previous image"
              disabled={active === 0}
              className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 opacity-0 shadow-sm transition-opacity duration-300 hover:bg-surface disabled:hidden group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:grid"
            >
              <ChevronLeft className="size-5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => goTo(Math.min(images.length - 1, active + 1))}
              aria-label="Next image"
              disabled={active === images.length - 1}
              className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 opacity-0 shadow-sm transition-opacity duration-300 hover:bg-surface disabled:hidden group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:grid"
            >
              <ChevronRight className="size-5" strokeWidth={1.5} />
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
              {images.map((img, i) => (
                <span
                  key={img.url}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === active ? "w-5 bg-gold" : "w-1.5 bg-surface/80",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
