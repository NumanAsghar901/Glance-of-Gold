/** Frame shape used when a photo's size is not known yet (portrait, width over height). */
export const DEFAULT_PHOTO_RATIO = 4 / 5;
/** Very tall or very wide photos are held to this range so one photo cannot break a row or a page. */
const MIN_RATIO = 0.55;
const MAX_RATIO = 1.5;

/** width / height of a product photo, ready for CSS `aspect-ratio`, so its frame is the shape of the photo. */
export function photoRatio(photo: { width?: number | null; height?: number | null } | null | undefined): number {
  if (!photo?.width || !photo.height) return DEFAULT_PHOTO_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, photo.width / photo.height));
}

/**
 * How much taller than the photos' own shape cards are drawn (1 = the same shape). A little extra height shows
 * the product larger, at the cost of trimming a little off the sides. Lower it for taller cards, raise it towards 1 for less trimming.
 */
const CARD_TALLER = 0.88;

/**
 * The frame shape for a row or page of cards: the middle (median) shape of the first photos, made a little taller (`CARD_TALLER`), so cards are all
 * one size and most photos fill their card with only a sliver trimmed at the sides. Photos that differ a lot from the rest are trimmed more.
 */
export function commonRatio(photos: ({ width?: number | null; height?: number | null } | null | undefined)[]): number {
  const known = photos.flatMap((p) => (p?.width && p.height ? [photoRatio(p)] : [])).sort((a, b) => a - b);
  if (known.length === 0) return DEFAULT_PHOTO_RATIO;
  const mid = Math.floor(known.length / 2);
  const median = known.length % 2 ? known[mid] : (known[mid - 1] + known[mid]) / 2;
  return Math.max(MIN_RATIO, Math.round(median * CARD_TALLER * 100) / 100);
}
