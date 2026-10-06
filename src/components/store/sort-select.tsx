"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SORTS } from "@/lib/shop-params";
import { cn } from "@/lib/utils";

/** Native select: accessible and fast on any phone. Each option carries its own target URL. */
export function SortSelect({
  value,
  hrefs,
}: {
  value: string;
  hrefs: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="relative inline-flex min-w-0 items-center text-sm">
      <span className="sr-only">Sort by</span>
      <select
        value={value}
        aria-busy={pending}
        onChange={(e) => {
          const href = hrefs[e.target.value];
          startTransition(() => router.push(href));
        }}
        className={cn(
          "h-11 cursor-pointer appearance-none border border-border bg-surface py-0 pl-4 pr-10 text-sm transition-[background-color,border-color,opacity] duration-200 hover:border-gold focus-visible:border-gold",
          pending && "animate-pulse border-gold bg-sand",
        )}
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" strokeWidth={1.5} />
    </label>
  );
}
