"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Announcement } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/**
 * Thin rotating strip above the header. Messages are stacked in one grid cell
 * and cross-fade with opacity only, so there is no layout shift and almost no
 * cost on low-end phones. Rotation stops while hovered/focused.
 */
export function AnnouncementBar({ items }: { items: Announcement[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 4500);
    return () => window.clearInterval(id);
  }, [items.length, paused]);

  if (items.length === 0) return null;

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard unavailable: the code stays visible to type manually */
    }
  }

  return (
    <div
      className="bg-foreground text-background"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="wrap grid h-9 place-items-center text-[0.6875rem] uppercase tracking-[0.16em] sm:text-xs">
        {items.map((item, i) => (
          <p
            key={item.id}
            aria-hidden={i !== index}
            className={cn(
              "col-start-1 row-start-1 flex items-center gap-2 text-center transition-opacity duration-300",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {item.href ? (
              <Link href={item.href} tabIndex={i === index ? 0 : -1} className="link-draw">
                {item.text}
              </Link>
            ) : (
              <span>{item.text}</span>
            )}
            {item.code && (
              <button
                type="button"
                tabIndex={i === index ? 0 : -1}
                onClick={() => copy(item.code!)}
                className="rounded-sm border border-gold px-2 py-0.5 font-medium tracking-[0.2em] text-gold transition-colors duration-200 hover:bg-gold hover:text-foreground"
                aria-label={`Copy coupon code ${item.code}`}
              >
                {copied === item.code ? "Copied" : item.code}
              </button>
            )}
          </p>
        ))}
      </div>
    </div>
  );
}
