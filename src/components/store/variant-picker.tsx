"use client";

import { Check, Minus, Plus } from "lucide-react";
import { maxQty, variantPrice, type VariantSelection } from "@/components/store/use-variant-selection";
import { Price } from "@/components/ui/price";
import type { ProductDetail } from "@/lib/data/types";
import { piecesLabel } from "@/lib/order-text";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { cn, formatPKR } from "@/lib/utils";

const chipBase =
  "grid min-h-11 min-w-12 cursor-pointer place-items-center border px-4 py-1.5 text-center text-sm leading-tight transition-[border-color,background-color,transform] duration-200 ease-(--ease-out) active:scale-[0.97] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold";
const chipOn = "border-foreground bg-foreground text-background";
const chipOff = "border-border bg-surface hover:border-gold";
const chipOut = "cursor-not-allowed text-muted-foreground line-through opacity-50 hover:border-border";

/** "a size", "a design", "a colour" or "an option": for button text like "Select a size". */
export function choiceNoun(product: ProductDetail, sel: VariantSelection) {
  if (sel.colourOnly) return "a colour";
  if (product.optionLabel === "Size") return "a size";
  if (product.optionLabel === "Design") return "a design";
  return "an option";
}

/** The price for what is chosen: one price, or the total when several are chosen. */
export function SelectionPrice({
  product,
  sel,
  className,
}: {
  product: ProductDetail;
  sel: VariantSelection;
  className?: string;
}) {
  if (sel.pieces > 1) {
    return (
      <p aria-live="polite" className={cn("flex flex-wrap items-baseline gap-x-2 text-sm", className)}>
        <span className="font-medium text-foreground">{formatPKR(sel.total)}</span>
        <span className="text-muted-foreground">for {piecesLabel(sel.pieces)}</span>
      </p>
    );
  }
  const v = sel.variant;
  return (
    <div aria-live="polite">
      <Price
        price={v ? variantPrice(product, v) : product.price}
        compareAt={v?.priceOverride ? null : product.compareAtPrice}
        className={className}
      />
    </div>
  );
}

/**
 * Colour chips, then size / design / option chips, then a note on what is selected and what is
 * running low. Radio buttons when one thing can be chosen, checkboxes when several can.
 */
export function VariantPicker({
  product,
  sel,
  idPrefix,
}: {
  product: ProductDetail;
  sel: VariantSelection;
  idPrefix: string;
}) {
  const word = sel.colourOnly ? "colour" : product.optionLabel === "Option" ? "option" : product.optionLabel.toLowerCase();
  const showChips = sel.hasChoice && (sel.chips.length > 1 || sel.multi);
  const lowSelected = sel.selected.filter((v) => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD);

  return (
    <div className="space-y-5">
      {sel.singleColour && (
        <p className="text-sm">
          Colour <span className="ml-2 text-muted-foreground">{sel.singleColour}</span>
        </p>
      )}

      {sel.showColourPicker && (
        <fieldset className="min-w-0">
          <legend className="text-sm">
            Colour <span className="ml-2 text-muted-foreground">{sel.colour ?? "Standard"}</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {sel.groups.map((g) => {
              const inGroup = product.variants.filter((v) => (v.color ?? null) === g);
              const out = inGroup.every((v) => v.stock < 1);
              const on = g === sel.colour;
              return (
                <label key={g ?? "none"} className="relative">
                  <input
                    type="radio"
                    name={`${idPrefix}-colour`}
                    checked={on}
                    onChange={() => sel.chooseColour(g)}
                    className="peer sr-only"
                  />
                  <span className={cn(chipBase, on ? chipOn : chipOff, out && !on && "opacity-60")}>
                    {g ?? "Standard"}
                    {out && <span className="sr-only"> (out of stock)</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {showChips && (
        <fieldset className="min-w-0">
          <legend className="text-sm">
            {sel.colourOnly ? "Colour" : word === "option" ? "Select option" : `Select ${word}`}
            {sel.multi ? "s" : ""}
            {!sel.multi && sel.variant && (
              <span className="ml-2 text-muted-foreground">
                {sel.colourOnly ? sel.variant.color : sel.variant.label || sel.variant.name}
              </span>
            )}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {sel.chips.map((v) => {
              const out = v.stock < 1;
              const qty = sel.lines.find((l) => l.variant.id === v.id)?.qty ?? 0;
              const on = qty > 0;
              const price = variantPrice(product, v);
              const label = sel.colourOnly ? (v.color ?? "Standard") : v.label || "Standard";
              return (
                <label key={v.id} className={cn("relative", out && "cursor-not-allowed")}>
                  <input
                    type={sel.multi ? "checkbox" : "radio"}
                    name={`${idPrefix}-option`}
                    value={v.id}
                    checked={on}
                    disabled={out}
                    onChange={() => sel.choose(v.id)}
                    className="peer sr-only"
                  />
                  <span className={cn(chipBase, on ? chipOn : chipOff, out && chipOut)}>
                    <span className="inline-flex items-center gap-1.5">
                      {sel.multi && on && <Check className="size-3.5" strokeWidth={2} aria-hidden="true" />}
                      {label}
                      {sel.multi && qty > 1 && <span className="text-xs opacity-80">x{qty}</span>}
                    </span>
                    {price !== product.price && <span className="text-xs opacity-80">{formatPKR(price)}</span>}
                    {out && <span className="sr-only"> (out of stock)</span>}
                  </span>
                </label>
              );
            })}
          </div>
          {sel.multi && (
            <p className="mt-2 text-xs text-muted-foreground">
              Choose one or more, then set how many of each. The price adds up.
            </p>
          )}
        </fieldset>
      )}

      {sel.multi && sel.lines.length > 0 && (
        <section aria-label="Your selection" className="text-sm">
          <p className="mb-2 flex flex-wrap justify-between gap-x-3">
            <span>Your selection</span>
            <span className="text-muted-foreground" aria-live="polite">
              {piecesLabel(sel.pieces)}, {formatPKR(sel.total)}
            </span>
          </p>
          <ul className="divide-y divide-border border border-border bg-surface">
            {sel.lines.map(({ variant: v, qty }) => {
              const each = variantPrice(product, v);
              const atMax = qty >= maxQty(v);
              return (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3">
                  <div className="min-w-0">
                    <p>{v.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPKR(each)} each
                      {v.stock <= LOW_STOCK_THRESHOLD && <span className="text-gold-hover">, only {v.stock} left</span>}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="inline-flex items-center border border-border" role="group" aria-label={`Quantity of ${v.name}`}>
                      <button
                        type="button"
                        onClick={() => sel.setQty(v.id, qty - 1)}
                        aria-label={qty === 1 ? `Remove ${v.name}` : `Decrease quantity of ${v.name}`}
                        className="grid size-11 place-items-center transition-colors duration-200 hover:bg-sand active:bg-sand"
                      >
                        <Minus className="size-4" strokeWidth={1.5} />
                      </button>
                      <span className="min-w-8 text-center tabular-nums" aria-live="polite">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => sel.setQty(v.id, qty + 1)}
                        disabled={atMax}
                        aria-label={`Increase quantity of ${v.name}`}
                        className="grid size-11 place-items-center transition-colors duration-200 hover:bg-sand active:bg-sand disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Plus className="size-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    <p className="min-w-[4.5rem] text-right font-medium">{formatPKR(each * qty)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!sel.multi && lowSelected.length > 0 && (
        <p aria-live="polite" className="text-sm text-gold-hover">
          Only {lowSelected[0].stock} left in stock
        </p>
      )}
    </div>
  );
}
