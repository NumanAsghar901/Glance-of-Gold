"use client";

import { useLinkStatus } from "next/link";

/**
 * Thin gold progress line along the bottom of the link it sits in, shown the moment the link is
 * tapped and until the next page arrives. Place it inside a `relative` <Link>. It is absolutely
 * positioned, so it never shifts the layout, and it only animates transform.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span aria-hidden="true" className="link-pending pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gold" />;
}
