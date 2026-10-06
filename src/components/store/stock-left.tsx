"use client";

import { usePurchase } from "@/components/store/purchase-context";
import { SHOW_STOCK_COUNT_UP_TO } from "@/lib/stock";
import { cn } from "@/lib/utils";

/**
 * "Only 28 items left in stock", worked out from what the customer is looking at: the size or colour
 * they have picked, or the whole product while nothing is picked. It changes the moment they choose
 * another size. Nothing is shown when it is out of stock (the tag beside the price says so).
 */
export function StockLeft({ className }: { className?: string }) {
  const { product, sel } = usePurchase();

  const units = (list: { stock: number }[]) => list.reduce((n, v) => n + Math.max(0, v.stock), 0);
  let left: number;
  let scope = "";
  if (sel.multi) {
    // Several sizes can be chosen at once, so count the sizes on offer (in the chosen colour, if there are colours).
    left = sel.showColourPicker ? units(sel.chips) : units(product.variants);
    if (sel.showColourPicker && sel.colour) scope = sel.colour;
  } else if (sel.variant) {
    left = Math.max(0, sel.variant.stock);
    if (sel.hasChoice) scope = sel.variant.name;
  } else {
    left = units(product.variants);
  }

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
        {scope && <span className="text-muted-foreground"> for {scope}</span>}
      </span>
    </p>
  );
}
