"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { HeroSlide } from "@/lib/hero-defaults";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 6500;

/**
 * Full-bleed banner carousel. Slides crossfade (opacity only) and the photo drifts slowly
 * (transform only), so it stays smooth on low-end phones. Autoplay pauses on hover, focus,
 * a hidden tab, and never runs for people who prefer reduced motion. Swipe on touch screens,
 * arrows and progress lines for everyone else.
 */
export function HeroBanner({ slides }: { slides: HeroSlide[] }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const vis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => {
      mq.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  const running = count > 1 && !paused && !hidden && !reduced;

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [running, index, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative isolate h-[min(46rem,calc(100svh-7rem))] min-h-[34rem] overflow-hidden bg-sand"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      {slides.map((s, i) => {
        const active = i === index;
        return (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={!active}
            className={cn(
              "absolute inset-0 transition-opacity duration-[900ms] ease-(--ease-out)",
              active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
            )}
          >
            <div className={cn("hero-drift absolute inset-0", active && !reduced && "hero-drift-on")}>
              <Image
                src={s.image}
                alt={s.alt}
                fill
                priority={i === 0}
                sizes="100vw"
                quality={85}
                className={cn("object-cover object-[70%_center]", s.mobileImage && "hidden md:block")}
              />
              {s.mobileImage && (
                <Image
                  src={s.mobileImage}
                  alt={s.alt}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  quality={85}
                  className="object-cover md:hidden"
                />
              )}
            </div>

            {/* Keeps the text readable over any photo an admin uploads */}
            <div className="absolute inset-0 hidden bg-gradient-to-r from-background/80 via-background/25 to-transparent md:block" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-background via-background/85 to-transparent md:hidden" aria-hidden="true" />

            <div className="wrap relative flex h-full flex-col justify-end pb-24 md:justify-center md:pb-0">
              <div className={cn("slide-text max-w-xl", active && "slide-text-on")}>
                {i === 0 ? (
                  <h1 className="text-display max-w-[12ch]">{s.heading}</h1>
                ) : (
                  <h2 className="text-display max-w-[12ch]">{s.heading}</h2>
                )}
                {s.subheading && (
                  <p className="mt-5 max-w-md text-base leading-relaxed text-foreground/75 md:mt-7 md:text-lg">{s.subheading}</p>
                )}
                <div className="mt-7 md:mt-10">
                  <Button href={s.ctaUrl} size="lg" tabIndex={active ? 0 : -1}>
                    {s.ctaLabel}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {count > 1 && (
        <div className="wrap pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between pb-5 md:pb-8">
          <div className="pointer-events-auto flex items-center" role="group" aria-label="Choose a slide">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === index}
                className="group grid h-11 w-12 place-items-center"
              >
                <span className="relative block h-0.5 w-9 overflow-hidden bg-foreground/25">
                  <span
                    key={i === index ? `on-${index}` : `off-${i}`}
                    className={cn(
                      "absolute inset-0 origin-left bg-gold",
                      i === index && running && "progress-run",
                      i === index && !running && "scale-x-100",
                      i !== index && "scale-x-0",
                    )}
                    style={i === index && running ? { animationDuration: `${INTERVAL_MS}ms` } : undefined}
                  />
                </span>
              </button>
            ))}
          </div>
          <div className="pointer-events-auto hidden gap-2 md:flex">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="grid size-11 place-items-center rounded-full bg-surface/85 transition-colors duration-200 hover:bg-surface"
            >
              <ChevronLeft className="size-5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="grid size-11 place-items-center rounded-full bg-surface/85 transition-colors duration-200 hover:bg-surface"
            >
              <ChevronRight className="size-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
