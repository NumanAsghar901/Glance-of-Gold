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
