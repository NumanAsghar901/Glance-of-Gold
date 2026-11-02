"use client";

import { usePurchase } from "@/components/store/purchase-context";
import { SHOW_STOCK_COUNT_UP_TO } from "@/lib/stock";
import { cn } from "@/lib/utils";

/**
 * "Only 28 items left in stock". Stock is one number for the whole product, so it does not depend on the size or
 * colour chosen. Nothing is shown when it is out of stock (the tag beside the price says so).
 */
export function StockLeft({ className }: { className?: string }) {
  const { product } = usePurchase();

  const left = Math.max(0, product.stock);
  if (left <= 0) return null;

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
      </span>
    </p>
  );
}
