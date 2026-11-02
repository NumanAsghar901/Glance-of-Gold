"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useBundleSelection, type BundleSelection } from "@/components/store/use-bundle-selection";
import { useVariantSelection, type VariantSelection } from "@/components/store/use-variant-selection";
import { OfferPrice, SelectionPrice } from "@/components/store/variant-picker";
import type { ProductDetail } from "@/lib/data/types";

type Purchase = { product: ProductDetail; sel: VariantSelection; bundle: BundleSelection };

const PurchaseContext = createContext<Purchase | null>(null);

/**
 * Holds what the customer has chosen on a product page, so the price near the title and the buy
 * buttons further down always agree. The server-rendered text in between is passed in as children.
 */
export function PurchaseProvider({ product, children }: { product: ProductDetail; children: ReactNode }) {
  const sel = useVariantSelection(product);
  // Only used for an offer of several pieces (bundleSize above 1); inert for every other product.
  const bundle = useBundleSelection(product);
  return <PurchaseContext.Provider value={{ product, sel, bundle }}>{children}</PurchaseContext.Provider>;
}

export function usePurchase() {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchase must be used inside <PurchaseProvider>");
  return ctx;
}

/** Price that follows the customer's choice (a size with its own price, or the total of several). */
export function LivePrice({ className }: { className?: string }) {
  const { product, sel } = usePurchase();
  if (product.bundleSize > 1) return <OfferPrice product={product} className={className} />;
  return <SelectionPrice product={product} sel={sel} className={className} />;
}
