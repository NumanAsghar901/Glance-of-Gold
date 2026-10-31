"use client";

import Image, { type ImageProps } from "next/image";
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
export function ProductPhoto({ fit = "contain", ratio = 4 / 5, src, quality, alt, ...rest }: Props) {
  if (typeof src === "string" && isCloudinarySrc(src)) {
    return <Image src={src} alt={alt} loader={fit === "fill" ? fillLoader(ratio) : limitLoader} {...rest} />;
  }
  return <Image src={src} alt={alt} quality={quality} {...rest} />;
}
