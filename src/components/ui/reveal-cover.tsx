"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Unveils the image beneath it once, when it scrolls into view: a panel the colour of the
 * image backdrop shrinks away. Transform only, so it is cheap on low-end phones.
 *
 * Progressive by design: the cover does not exist in the server HTML, so without JavaScript
 * (or with reduced motion) the image is simply visible.
 */
export function RevealCover() {
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (reduce || !mounted) return null;

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        aria-hidden="true"
        className="absolute inset-0 origin-top bg-sand"
        initial={{ scaleY: 1 }}
        whileInView={{ scaleY: 0 }}
        viewport={{ once: true, margin: "0px 0px -120px 0px" }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
    </LazyMotion>
  );
}
