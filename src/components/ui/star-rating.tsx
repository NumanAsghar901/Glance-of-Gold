import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Read-only stars with partial fill (4.6 fills four and a bit more than half of the fifth).
 * Pass `label` so assistive tech hears the rating once instead of five separate icons.
 */
export function StarRating({
  rating,
  size = "md",
  className,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const px = size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-4";
  const pct = Math.max(0, Math.min(5, rating)) * 20;
  const row = (cls: string) => (
    <span className="flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} className={cn(px, "shrink-0", cls)} strokeWidth={1.5} />
      ))}
    </span>
  );

  return (
    <span
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
      className={cn("relative inline-flex", className)}
    >
      <span className="text-border" aria-hidden="true">
        {row("fill-sand")}
      </span>
      <span className="absolute inset-y-0 left-0 overflow-hidden text-gold" style={{ width: `${pct}%` }} aria-hidden="true">
        {row("fill-gold")}
      </span>
    </span>
  );
}
