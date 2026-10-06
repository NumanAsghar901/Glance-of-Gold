/**
 * How big a photo must be to look sharp where the store shows it. No imports, so the admin forms (browser)
 * and the upload code (server) share one set of rules.
 *
 * The numbers come from measuring real screens: a phone with a 3x display needs about 3 pixels of photo for
 * every pixel it shows, a laptop with a 2x display needs 2. A photo smaller than its slot is stretched by
 * the browser, and stretching is what looks blurry. No code can add detail that is not in the file.
 *
 * - product and category: shown 4:5 on cards (about 170 to 330 px wide) and up to about 700 px wide in the gallery.
 * - banner-wide: full width of a laptop or desktop, about 690 to 740 px tall.
 * - banner-tall: full width of a phone (about 375 px) and about 690 px tall.
 */
export type ImageSlot = "product" | "category" | "banner-wide" | "banner-tall";

export type ImageSpec = {
  name: string;
  /** [width, height] that looks sharp on phones and big screens. */
  recommended: [number, number];
  /** Below this the photo is turned away: it will look blurry. */
  minimum: [number, number];
  /** Photos are reduced to this many pixels on the long edge before upload, which is plenty and keeps files small. */
  maxEdge: number;
};

export const IMAGE_SPECS: Record<ImageSlot, ImageSpec> = {
  product: { name: "product photo", recommended: [1200, 1500], minimum: [800, 1000], maxEdge: 2000 },
  category: { name: "category photo", recommended: [1200, 1500], minimum: [800, 1000], maxEdge: 2000 },
  "banner-wide": { name: "wide banner photo", recommended: [2400, 1200], minimum: [1600, 800], maxEdge: 2400 },
  "banner-tall": { name: "tall banner photo", recommended: [1080, 1920], minimum: [750, 1300], maxEdge: 2000 },
};

export type SizeVerdict = "sharp" | "soft" | "too-small";

/** "too-small" below the minimum, "soft" up to nearly the recommended size, "sharp" from there. */
export function judgeImageSize(slot: ImageSlot, width: number, height: number): SizeVerdict {
  const { minimum, recommended } = IMAGE_SPECS[slot];
  if (width < minimum[0] || height < minimum[1]) return "too-small";
  if (width < recommended[0] * 0.9 || height < recommended[1] * 0.9) return "soft";
  return "sharp";
}

const px = (w: number, h: number) => `${w.toLocaleString("en-PK")} × ${h.toLocaleString("en-PK")}`;

/** A sentence for the admin: what the photo is, and what it needs. */
export function describeImageSize(slot: ImageSlot, width: number, height: number): { verdict: SizeVerdict; text: string } {
  const verdict = judgeImageSize(slot, width, height);
  const { name, recommended, minimum } = IMAGE_SPECS[slot];
  if (verdict === "too-small") {
    return {
      verdict,
      text: `This ${name} is ${px(width, height)} pixels. It needs at least ${px(minimum[0], minimum[1])} (best ${px(recommended[0], recommended[1])}) or it will look blurry. Please use a larger photo.`,
    };
  }
  if (verdict === "soft") {
    return {
      verdict,
      text: `${px(width, height)} pixels will work, but ${px(recommended[0], recommended[1])} or larger looks sharper on phones and big screens.`,
    };
  }
  return { verdict, text: `${px(width, height)} pixels, sharp.` };
}
