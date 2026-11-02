"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SelectionPrice } from "@/components/store/option-picker";
import { useOptionSelection, type OptionSelection } from "@/components/store/use-option-selection";
import type { ProductDetail } from "@/lib/data/types";

type Purchase = { product: ProductDetail; sel: OptionSelection };

const PurchaseContext = createContext<Purchase | null>(null);

/**
 * Holds what the customer has chosen on a product page, so the price near the title and the buy
 * buttons further down always agree. The server-rendered text in between is passed in as children.
 */
export function PurchaseProvider({ product, children }: { product: ProductDetail; children: ReactNode }) {
  const sel = useOptionSelection(product);
  return <PurchaseContext.Provider value={{ product, sel }}>{children}</PurchaseContext.Provider>;
}

export function usePurchase() {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchase must be used inside <PurchaseProvider>");
  return ctx;
}

/** The product's price. It stays the same whatever is chosen; the total is shown with the selection. */
export function LivePrice({ className }: { className?: string }) {
  const { product } = usePurchase();
  return <SelectionPrice product={product} className={className} />;
}
