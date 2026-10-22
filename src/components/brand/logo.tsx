import { cn } from "@/lib/utils";

/**
 * Brand mark: an "L" for Little Luxe Glow with a sparkle beside it for the glow.
 * Thin gold strokes only, matching the hairline style of the site.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("text-gold", className)}
    >
      <g transform="translate(-5 0)">
        {/* The L */}
        <path d="M19 7v37.5c0 3.6 2.4 6.5 6 6.5h22" />
        {/* Large and small sparkle */}
        <path d="M43 6c.9 7.2 4.6 10.9 11.8 11.8C47.6 18.7 43.9 22.4 43 29.6c-.9-7.2-4.6-10.9-11.8-11.8C38.4 16.9 42.1 13.2 43 6Z" />
        <path d="M51.5 33c.5 3.7 2.3 5.5 6 6-3.7.5-5.5 2.3-6 6-.5-3.7-2.3-5.5-6-6 3.7-.5 5.5-2.3 6-6Z" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  stacked = false,
  compact = false,
}: {
  className?: string;
  stacked?: boolean;
  /** Smaller wordmark for narrow spaces such as the admin sidebar. */
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 sm:gap-3",
        stacked && "flex-col gap-2 text-center",
        className,
      )}
    >
      <LogoMark className={stacked ? "h-10" : compact ? "h-6" : "h-6 min-[430px]:h-7 sm:h-8"} />
      <span className="flex flex-col leading-none">
        <span className={cn("whitespace-nowrap font-heading font-medium uppercase text-foreground", compact ? "text-[0.85rem] tracking-[0.14em]" : "text-[0.75rem] tracking-[0.12em] min-[430px]:text-[0.9rem] min-[430px]:tracking-[0.16em] sm:text-[1.15rem] sm:tracking-[0.22em]")}>
          Little Luxe Glow
        </span>
        <span className="mt-1.5 text-[0.55rem] font-medium uppercase tracking-[0.5em] text-muted-foreground">
          Jewellery
        </span>
      </span>
    </span>
  );
}
