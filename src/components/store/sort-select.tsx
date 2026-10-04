"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { SORTS } from "@/lib/shop-params";

/** Native select: accessible and fast on any phone. Each option carries its own target URL. */
export function SortSelect({
  value,
  hrefs,
}: {
  value: string;
  hrefs: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <label className="relative inline-flex items-center text-sm">
      <span className="sr-only">Sort by</span>
      <select
        value={value}
        onChange={(e) => router.push(hrefs[e.target.value])}
        className="h-11 cursor-pointer appearance-none border border-border bg-surface py-0 pl-4 pr-10 text-sm transition-colors duration-200 hover:border-gold focus-visible:border-gold"
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
