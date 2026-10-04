"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { cartActions } from "@/lib/cart-store";
import type { ProductSummary } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/** One-tap add for single-variant products. Always visible on touch, fades in on hover for mouse users. */
export function QuickAdd({ product, className }: { product: ProductSummary; className?: string }) {
  const [done, setDone] = useState(false);
  const qa = product.quickAdd;
  if (!qa) return null;

  return (
    <button
      type="button"
      aria-label={`Add ${product.name} to bag`}
      onClick={() => {
        cartActions.add({
          variantId: qa.variantId,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          variantName: qa.variantName,
          price: product.price,
          image: product.images[0]?.url ?? null,
          stock: qa.stock,
        });
        setDone(true);
        window.setTimeout(() => setDone(false), 1400);
      }}
      className={cn(
        "grid size-11 place-items-center rounded-full bg-surface text-foreground shadow-sm",
        "transition-[transform,background-color,color,opacity] duration-300 ease-(--ease-out)",
        "hover:bg-gold hover:text-foreground active:scale-95",
        "[@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0",
        "[@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100",
        "focus-visible:translate-y-0 focus-visible:opacity-100",
        className,
      )}
    >
      {done ? <Check className="size-5" strokeWidth={1.5} /> : <Plus className="size-5" strokeWidth={1.5} />}
    </button>
  );
}
