import Link from "next/link";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  linkLabel,
  href,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  linkLabel?: string;
  href?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn(align === "center" && "flex flex-col items-center")}>
        {eyebrow && <p className="text-eyebrow text-gold-hover">{eyebrow}</p>}
        <h2 className="text-title mt-2">{title}</h2>
        <div className="mt-4 h-px w-16 bg-gold" aria-hidden="true" />
      </div>
      {linkLabel && href && (
        <Link href={href} className="link-draw self-start text-[0.8125rem] uppercase tracking-[0.14em] sm:self-auto">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
