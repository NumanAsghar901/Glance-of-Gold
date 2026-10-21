/**
 * Where a photo is used. No imports, so the admin forms (browser) and the upload code (server) share it.
 *
 * Any photo size is accepted: nothing is turned away for being small. Only photos longer than the limit
 * below are reduced, which keeps storage and page weight in check while staying far sharper than any screen
 * the store is shown on (a phone with a 3x display shows a product photo about 700 pixels wide, so 2,100).
 */
export type ImageSlot = "product" | "category" | "banner-wide" | "banner-tall";

/** Longest side, in pixels, a stored photo keeps. Longer photos are reduced to this. */
export const MAX_EDGE: Record<ImageSlot, number> = {
  product: 3000,
  category: 3000,
  "banner-wide": 3600,
  "banner-tall": 3000,
};
