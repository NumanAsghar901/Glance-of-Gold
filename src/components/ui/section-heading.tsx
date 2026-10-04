import Link from "next/link";
import { cn } from "@/lib/utils";

/** Section title with a full-width hairline underneath: the rule separates sections, it is not decoration. */
export function SectionHeading({
  title,
  linkLabel,
  href,
  className,
}: {
  title: string;
  linkLabel?: string;
  href?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-6 border-b border-border pb-5", className)}>
      <h2 className="text-title">{title}</h2>
      {linkLabel && href && (
        <Link href={href} className="link-draw shrink-0 pb-1 text-[0.9375rem]">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
