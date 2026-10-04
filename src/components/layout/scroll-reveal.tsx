"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const DURATION_MS = 440;
const STAGGER_MS = 55;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Quick scroll-in animation for every `.reveal` element: it slides up and fades in as it enters
 * the screen, staggered by position within its row or grid.
 *
 * - Uses the Web Animations API, so it never edits an element's attributes or classes. That keeps
 *   React's hydration happy and means nothing is hidden if JavaScript is off.
 * - Anything already on screen when the page loads simply stays visible (no flash, no delay).
 * - Only transform and opacity animate, so it is cheap on low-end phones.
 * - People who prefer reduced motion get plain visible content.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof Element.prototype.animate !== "function") return;

    const pending = new Map<Element, Animation>();
    const seen = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const anim = pending.get(e.target);
          io.unobserve(e.target);
          pending.delete(e.target);
          if (!anim) continue;
          anim.onfinish = () => anim.cancel(); // hand the element back to its normal styles
          anim.play();
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.06 },
    );

    const scan = () => {
      const viewport = window.innerHeight;
      for (const el of document.querySelectorAll<HTMLElement>(".reveal")) {
        if (seen.has(el)) continue;
        seen.add(el);
        // Already visible on arrival: leave it alone.
        if (el.getBoundingClientRect().top < viewport * 0.92) continue;

        const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains("reveal")) : [el];
        const index = Math.min(Math.max(siblings.indexOf(el), 0), 5);

        // Paused at time 0 with fill "both": the element is held in its hidden state until it enters.
        const anim = el.animate(
          [
            { opacity: 0, transform: "translateY(28px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: DURATION_MS, delay: index * STAGGER_MS, easing: EASE, fill: "both" },
        );
        anim.pause();
        anim.currentTime = 0;
        pending.set(el, anim);
        io.observe(el);
      }
    };

    scan();

    // Content that appears later (client-rendered lists, route changes) gets the same treatment.
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      for (const anim of pending.values()) anim.cancel();
      pending.clear();
    };
  }, [pathname]);

  return null;
}
