"use client";

import { usePurchase } from "@/components/store/purchase-context";
import { SHOW_STOCK_COUNT_UP_TO } from "@/lib/stock";
import { cn } from "@/lib/utils";

/**
 * "Only 28 items left in stock", worked out from what the customer is looking at: whatever they have chosen so
 * far (a size, a design, a colour, or any mix), or the whole product while nothing is chosen. It changes the
 * moment they choose something else. Nothing is shown when it is out of stock (the tag beside the price says so).
 */
export function StockLeft({ className }: { className?: string }) {
  const { product, sel } = usePurchase();

  const left = sel.scope.reduce((n, v) => n + Math.max(0, v.stock), 0);
  if (left <= 0 || product.variants.length === 0) return null;

  // Say which choice the count is for, when a choice has been made, for example "for Size 6".
  const scope = sel.hasChoice && !sel.multi ? sel.scopeLabel : "";

  return (
    <p aria-live="polite" className={cn("flex items-center gap-3 text-sm", className)}>
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-gold ring-4 ring-gold/25" />
      <span>
        {left > SHOW_STOCK_COUNT_UP_TO ? (
          "In stock"
        ) : (
          <>
            Only <strong className="font-medium">{left}</strong> {left === 1 ? "item" : "items"} left in stock
          </>
        )}
        {scope && <span className="text-muted-foreground"> for {scope}</span>}
      </span>
    </p>
  );
}
