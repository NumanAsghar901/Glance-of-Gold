"use client";

import Image, { getImageProps, type ImageProps } from "next/image";
import { fillLoader, isCloudinarySrc, limitLoader } from "@/lib/cloudinary";

type Props = Omit<ImageProps, "loader" | "unoptimized"> & {
  /**
   * "fill" crops the photo to a frame of this shape (width over height), as on product cards.
   * "contain" shows the whole photo, never cropped (product page, quick view, bag).
   */
  fit?: "fill" | "contain";
  /** The frame's shape when `fit` is "fill". Defaults to the standard 4:5 portrait. */
  ratio?: number;
};

/**
 * Every product photo goes through here. Photos stored on Cloudinary are sized and converted by Cloudinary itself
 * (f_auto, q_auto), so they never use Vercel's image optimiser and `quality` is ignored. Older photos still on
 * Supabase Storage keep using Next's optimiser, with `quality`, until `npm run migrate-images-to-cloudinary` has copied them.
 */
export function Photo({ fit = "contain", ratio = 4 / 5, src, quality, alt, ...rest }: Props) {
  if (typeof src === "string" && isCloudinarySrc(src)) {
    return <Image src={src} alt={alt} loader={fit === "fill" ? fillLoader(ratio) : limitLoader} {...rest} />;
  }
  return <Image src={src} alt={alt} quality={quality} {...rest} />;
}

/**
 * One picture with a different photo for phones (art direction), for example the banner: a tall photo below 768px
 * and a wide one from there up. Both photos are described to the browser in a single <picture>, so a phone
 * downloads only the tall one and a computer only the wide one. (Two images hidden with CSS would both be
 * downloaded, and Next would warn that the hidden one is not rendered at full width.)
 */
export function PhotoArt({
  src,
  mobileSrc,
  alt,
  sizes,
  priority,
  quality,
  className,
}: {
  src: string;
  /** Shown instead of `src` below 768px. Without it every screen gets `src`. */
  mobileSrc?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  quality?: number;
  className?: string;
}) {
  // Banners are shown whole and trimmed by the page's CSS (object-cover), so Cloudinary only has to size them.
  const props = (source: string) =>
    getImageProps({
      src: source,
      alt,
      fill: true,
      sizes,
      priority,
      ...(isCloudinarySrc(source) ? { loader: limitLoader } : { quality }),
    }).props;
  const main = props(src);
  const phone = mobileSrc ? props(mobileSrc) : null;

  return (
    <picture>
      {phone && <source media="(max-width: 767px)" srcSet={phone.srcSet} sizes={sizes} />}
      <img {...main} alt={alt} className={className} />
    </picture>
  );
}
