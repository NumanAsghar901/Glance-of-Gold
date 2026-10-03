import { cn } from "@/lib/utils";

/**
 * Brand mark: a solitaire ring whose band is drawn as a "G".
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
      {/* Band shaped as a G */}
      <path d="M47.32 25.14A20 20 0 1 0 52 38H36" />
      {/* Gem */}
      <path d="M32 3.5 38.5 11 32 18 25.5 11Z" />
      <path d="M25.5 11h13M32 3.5 29.5 11 32 18l2.5-7Z" strokeWidth="1.1" />
    </svg>
  );
}

export function Logo({
  className,
  stacked = false,
}: {
  className?: string;
  stacked?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3",
        stacked && "flex-col gap-2 text-center",
        className,
      )}
    >
      <LogoMark className={stacked ? "h-10" : "h-8"} />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-[1.15rem] font-medium uppercase tracking-[0.28em] text-foreground sm:text-[1.3rem]">
          Glance of Gold
        </span>
        <span className="mt-1.5 text-[0.55rem] font-medium uppercase tracking-[0.5em] text-muted-foreground">
          Jewellery
        </span>
      </span>
    </span>
  );
}
