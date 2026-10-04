"use client";

import { useEffect } from "react";

/**
 * Inertial smooth scrolling for desktop mice and trackpads only. Phones and tablets already have
 * native momentum scrolling, and anyone who prefers reduced motion keeps normal scrolling.
 * The library loads after the page is idle so it never delays first paint.
 */
export function SmoothScroll() {
  useEffect(() => {
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!desktop || reduce) return;

    let raf = 0;
    let lenis: import("lenis").default | undefined;
    let cancelled = false;

    const start = async () => {
      const { default: Lenis } = await import("lenis");
      if (cancelled) return;
      lenis = new Lenis({
        lerp: 0.1,
        wheelMultiplier: 0.95,
        // Dialogs (cart, menu, quick view) and marked areas scroll natively.
        prevent: (node) => !!node.closest("dialog, [data-lenis-prevent]"),
      });
      document.documentElement.classList.add("lenis");
      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };

    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400));
    const handle = idle(() => void start());

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
      document.documentElement.classList.remove("lenis");
      if (window.cancelIdleCallback && typeof handle === "number") window.cancelIdleCallback(handle);
    };
  }, []);

  return null;
}
