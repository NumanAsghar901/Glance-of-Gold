import Image from "next/image";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * The brand logo, from the files in public/brand (made from brand/logo-source.png by `npm run make-logo-assets`).
 * They are small, already the right size and have a transparent background, so they are served as they are
 * (`unoptimized`): no image optimiser is involved. Set the size with a height class such as `h-8`; the width follows.
 */
const FILES = {
  /** "Little Luxe Glow / Jewellery": header, menu, admin sidebar. */
  wordmark: { src: "/brand/logo-wordmark.png", width: 508, height: 108 },
  /** The head and the wordmark together: footer, sign in. */
  full: { src: "/brand/logo-full.png", width: 508, height: 402 },
} as const;

export function Logo({
  className,
  variant = "wordmark",
  priority,
  decorative,
}: {
  /** Give it a height (`h-8`); the width follows the picture. */
  className?: string;
  variant?: keyof typeof FILES;
  /** True above the fold, so the browser fetches it first. */
  priority?: boolean;
  /** When the words are already next to it (a link with its own label), so a screen reader does not say it twice. */
  decorative?: boolean;
}) {
  const file = FILES[variant];
  return (
    <Image
      src={file.src}
      width={file.width}
      height={file.height}
      alt={decorative ? "" : `${site.name} Jewellery`}
      priority={priority}
      unoptimized
      className={cn("w-auto select-none", className)}
    />
  );
}

/** The head from the logo on its own, for places that only need the symbol (a product frame with no photo yet). */
export function LogoMark({ className }: { className?: string }) {
  return <Image src="/brand/logo-mark.png" width={378} height={306} alt="" unoptimized className={cn("w-auto select-none", className)} />;
}
