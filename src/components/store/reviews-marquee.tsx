"use client";

import Link from "next/link";
import { useState } from "react";
import { StarRating } from "@/components/ui/star-rating";
import type { Review } from "@/lib/data/types";

/**
 * Customer reviews drifting from right to left. The list is rendered twice and the track slides
 * by exactly one copy, so the loop has no visible seam. It stops while the pointer is over it
 * (mouse) or while a finger is on it (touch), and keyboard focus inside also pauses it.
 * Transform only, so it stays smooth on low-end phones. With reduced motion it becomes a plain
 * horizontally scrollable row.
 */
export function ReviewsMarquee({ reviews }: { reviews: Review[] }) {
  const [paused, setPaused] = useState(false);
  if (reviews.length === 0) return null;

  // About seven seconds per card keeps the pace calm; never faster than 40s per loop.
  const seconds = Math.max(40, reviews.length * 7);

  const set = (hidden: boolean) =>
    reviews.map((r) => (
      <li key={`${hidden ? "b" : "a"}-${r.id}`} className="w-[18.5rem] shrink-0 sm:w-[23rem]">
        <figure className="flex h-full flex-col border border-border bg-surface p-6">
          <StarRating rating={r.rating} size="sm" />
          <blockquote className="mt-4 line-clamp-5 flex-1 text-[0.9375rem] leading-relaxed">{r.comment}</blockquote>
          <figcaption className="mt-5 text-sm">
            <span className="font-medium">{r.authorName}</span>
            {r.city && <span className="text-muted-foreground">, {r.city}</span>}
            {r.product && (
              <Link
                href={`/product/${r.product.slug}`}
                tabIndex={hidden ? -1 : 0}
                className="link-draw mt-1 block w-fit text-muted-foreground transition-colors hover:text-foreground"
              >
                {r.product.name}
              </Link>
            )}
          </figcaption>
        </figure>
      </li>
    ));

  return (
    <div
      className="marquee-mask overflow-hidden motion-reduce:overflow-x-auto"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="marquee-track flex w-max"
        style={{ animationDuration: `${seconds}s`, animationPlayState: paused ? "paused" : "running" }}
      >
        <ul className="flex gap-5 pr-5" aria-label="Customer reviews">
          {set(false)}
        </ul>
        <ul className="flex gap-5 pr-5" aria-hidden="true">
          {set(true)}
        </ul>
      </div>
    </div>
  );
}
