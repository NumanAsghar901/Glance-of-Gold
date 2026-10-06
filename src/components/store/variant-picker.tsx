"use client";

import { Check, Minus, Plus } from "lucide-react";
import {
  maxQty,
  variantPrice,
  type DimInfo,
  type VariantSelection,
} from "@/components/store/use-variant-selection";
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

/** "a size", "a design", "a size or design" or "a colour": for button text like "Select a size". */
export function choiceNoun(sel: VariantSelection) {
  switch (sel.missing) {
    case "colour":
      return "a colour";
    case "size":
      return "a size";
    case "design":
      return "a design";
    case "size-or-design":
      return "a size or design";
    default:
      return "an option";
  }
}

/** The price for what is chosen: one price, or the total when several pieces are chosen. */
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

/** One kind of choice (colour, size or design): its chips, as radio buttons or, when several are allowed or it may be skipped, checkboxes. */
function Group({ d, sel, idPrefix }: { d: DimInfo; sel: VariantSelection; idPrefix: string }) {
  const picked = sel.chosen[d.dim];
  const heading = d.dim === "colour" ? "Colour" : `Select ${d.label.toLowerCase()}${d.multiSelect ? "s" : ""}`;
  const skippable = sel.canSkip(d.dim);

  // Only one value exists: nothing to choose, just say what it is.
  if (d.fixed) {
    return (
      <p className="text-sm">
        {d.label} <span className="ml-2 text-muted-foreground">{d.values[0]}</span>
      </p>
    );
  }

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm">
        {heading}
        {!d.multiSelect && picked[0] !== undefined && (
          <span className="ml-2 text-muted-foreground">{picked[0] ?? "Standard"}</span>
        )}
        {skippable && picked.length === 0 && <span className="ml-2 text-muted-foreground">(optional)</span>}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {d.values.map((value) => {
          const on = picked.includes(value);
          const out = sel.isDisabled(d.dim, value);
          const price = sel.valuePrice(d.dim, value);
          return (
            <label key={value ?? "none"} className={cn("relative", out && "cursor-not-allowed")}>
              <input
                type={d.multiSelect || skippable ? "checkbox" : "radio"}
                name={`${idPrefix}-${d.dim}`}
                checked={on}
                disabled={out}
                onChange={() => sel.toggleValue(d.dim, value)}
                className="peer sr-only"
              />
              <span className={cn(chipBase, on ? chipOn : chipOff, out && chipOut)}>
                <span className="inline-flex items-center gap-1.5">
                  {(d.multiSelect || skippable) && on && <Check className="size-3.5" strokeWidth={2} aria-hidden="true" />}
                  {value ?? "Standard"}
                </span>
                {price !== null && <span className="text-xs opacity-80">{formatPKR(price)}</span>}
                {out && <span className="sr-only"> (not available)</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * The pickers for a product: colour, size and design, each in its own block with a line between them, then what
 * is chosen (with a quantity for each line when several can be chosen), then a note about what is running low.
 * Size and design are independent: either one can be chosen without the other.
 */
export function VariantPicker({
  product,
  sel,
  idPrefix,
  stockNote = true,
}: {
  product: ProductDetail;
  sel: VariantSelection;
  idPrefix: string;
  /** Show "Only N left in stock" under the choices. Off where a stock line is already shown nearby. */
  stockNote?: boolean;
}) {
  const anyMulti = sel.dims.some((d) => d.multiSelect && !d.fixed);
  const eitherOne = sel.dims.filter((d) => d.dim !== "colour" && !d.fixed).length === 2;
  const lowSingle = !sel.multi && sel.variant && sel.variant.stock > 0 && sel.variant.stock <= LOW_STOCK_THRESHOLD;

  return (
    <div className="space-y-5">
      {eitherOne && (
        <p className="text-xs text-muted-foreground">
          Choose a size, a design, or both. You do not need to choose both.
        </p>
      )}

      {/* Colour, size and design each sit in their own block with a line between them: size on top, design below. */}
      {sel.dims.length > 0 && (
        <div className="divide-y divide-border">
          {sel.dims.map((d) => (
            <div key={d.dim} className="py-5 first:pt-0 last:pb-0">
              <Group d={d} sel={sel} idPrefix={idPrefix} />
            </div>
          ))}
        </div>
      )}

      {anyMulti && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Choose one or more, then set how many of each. The price adds up.
        </p>
      )}

      {sel.unavailable && (
        <p role="status" className="text-sm text-muted-foreground">
          That mix is not available right now. Please try another.
        </p>
      )}

      {/* Say plainly what is chosen. */}
      {!sel.multi && sel.chosenLabel && sel.hasChoice && (
        <p aria-live="polite" className="text-sm">
          You chose <span className="font-medium">{sel.chosenLabel}</span>
        </p>
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
            {sel.lines.map(({ key, variant: v, qty, label }) => {
              const each = variantPrice(product, v);
              const atMax = qty >= maxQty(v);
              return (
                <li key={key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3">
                  <div className="min-w-0">
                    <p>{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPKR(each)} each
                      {v.stock <= LOW_STOCK_THRESHOLD && <span className="text-gold-hover">, only {v.stock} left</span>}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="inline-flex items-center border border-border" role="group" aria-label={`Quantity of ${label}`}>
                      <button
                        type="button"
                        onClick={() => sel.stepQty(key, -1)}
                        aria-label={qty === 1 ? `Remove ${label}` : `Decrease quantity of ${label}`}
                        className="grid size-11 place-items-center transition-colors duration-200 hover:bg-sand active:bg-sand"
                      >
                        <Minus className="size-4" strokeWidth={1.5} />
                      </button>
                      <span className="min-w-8 text-center tabular-nums" aria-live="polite">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => sel.stepQty(key, 1)}
                        disabled={atMax}
                        aria-label={`Increase quantity of ${label}`}
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

      {stockNote && lowSingle && sel.variant && (
        <p aria-live="polite" className="text-sm text-gold-hover">
          Only {sel.variant.stock} left in stock
        </p>
      )}
    </div>
  );
}
