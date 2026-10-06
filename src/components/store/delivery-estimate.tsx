"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "Asia/Karachi" });

/** "Oct 10 – Oct 11": today plus the shortest and longest delivery time, in Pakistan time. */
function arrivalRange(minDays: number, maxDays: number) {
  const now = Date.now();
  const from = dateFormat.format(new Date(now + minDays * DAY_MS));
  const to = dateFormat.format(new Date(now + maxDays * DAY_MS));
  return from === to ? from : `${from} – ${to}`;
}

const subscribe = () => () => {};

/**
 * Soft pill under the free delivery line: "Delivery in 4 to 5 days, get by Oct 10 – Oct 11".
 * Product pages are cached, so the dates are worked out in the browser on the day the visitor looks.
 * The server-rendered text has no dates, which keeps the first paint identical and avoids stale days.
 */
export function DeliveryEstimate({ minDays, maxDays, className }: { minDays: number; maxDays: number; className?: string }) {
  const arrival = useSyncExternalStore(
    subscribe,
    () => arrivalRange(minDays, maxDays),
    () => null,
  );
  const days = minDays === maxDays ? `${minDays} ${minDays === 1 ? "day" : "days"}` : `${minDays} to ${maxDays} days`;

  return (
    <p
      className={cn(
        "flex items-center justify-center gap-3 rounded-full border border-border bg-sand/60 px-5 py-3 text-center text-sm leading-snug",
        className,
      )}
    >
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-success ring-4 ring-success/25" />
      <span>
        Delivery in {days}
        {arrival && (
          <>
            , <span className="whitespace-nowrap">get by {arrival}</span>
          </>
        )}
      </span>
    </p>
  );
}
