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
 * The frame shape for a row or page of cards: the middle (median) shape of the first photos, so cards are all
 * one size and most photos fill their card whole. Photos that differ a lot from the rest are trimmed on the card.
 */
export function commonRatio(photos: ({ width?: number | null; height?: number | null } | null | undefined)[]): number {
  const known = photos.flatMap((p) => (p?.width && p.height ? [photoRatio(p)] : [])).sort((a, b) => a - b);
  if (known.length === 0) return DEFAULT_PHOTO_RATIO;
  const mid = Math.floor(known.length / 2);
  const median = known.length % 2 ? known[mid] : (known[mid - 1] + known[mid]) / 2;
  return Math.round(median * 100) / 100;
}
