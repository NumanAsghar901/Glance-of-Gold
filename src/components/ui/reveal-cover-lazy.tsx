"use client";

import dynamic from "next/dynamic";

/**
 * The unveiling animation sits below the fold, so its code (and Framer Motion) loads
 * after the page is interactive instead of inside the first-load bundle.
 */
export const RevealCover = dynamic(() => import("@/components/ui/reveal-cover").then((m) => m.RevealCover), {
  ssr: false,
});
