import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The brand motif: an arch, like the mehrab niche in Mughal architecture, with a
 * second gold hairline arch offset behind it. Used for the hero, the story and the
 * about page, and nowhere else, so it stays recognisable.
 */
export function ArchFrame({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden="true"
        className="arch-echo absolute inset-0 translate-x-3 translate-y-3 rounded-t-[999px] border border-gold sm:translate-x-5 sm:translate-y-5"
      />
      <div className={cn("relative aspect-[4/5] overflow-hidden rounded-t-[999px] bg-sand", innerClassName)}>
        {children}
      </div>
    </div>
  );
}
