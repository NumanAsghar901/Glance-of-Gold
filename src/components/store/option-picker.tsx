"use client";

import { Check, Minus, Plus } from "lucide-react";
import type { GroupView, OptionSelection } from "@/components/store/use-option-selection";
import { Price } from "@/components/ui/price";
import type { ProductDetail } from "@/lib/data/types";
import { piecesLabel } from "@/lib/order-text";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { cn, formatPKR } from "@/lib/utils";

const chipBase =
  "grid min-h-11 min-w-12 cursor-pointer place-items-center border px-4 py-1.5 text-center text-sm leading-tight transition-[border-color,background-color,transform] duration-200 ease-(--ease-out) active:scale-[0.97] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold";
const chipOn = "border-foreground bg-foreground text-background";
const chipOff = "border-border bg-surface hover:border-gold";

/** "a size", "a colour" or "a size and colour": for button text like "Select a size". */
export const choiceNoun = (sel: OptionSelection) => sel.missing ?? "an option";

/** The price for what is chosen: one price, or the total when several pieces are chosen. */
export function SelectionPrice({ product, sel, className }: { product: ProductDetail; sel: OptionSelection; className?: string }) {
  if (sel.pieces > 1) {
    return (
      <p aria-live="polite" className={cn("flex flex-wrap items-baseline gap-x-2 text-sm", className)}>
        <span className="font-medium text-foreground">{formatPKR(sel.total)}</span>
        <span className="text-muted-foreground">for {piecesLabel(sel.pieces)}</span>
      </p>
    );
  }
  return (
    <div aria-live="polite">
      <Price price={product.price} compareAt={product.compareAtPrice} className={className} />
    </div>
  );
}

/** A quantity with - and + buttons. Going below one calls `onChange` with 0 so the caller can remove the line. */
function Stepper({ qty, max, label, onStep }: { qty: number; max: boolean; label: string; onStep: (delta: 1 | -1) => void }) {
  return (
    <div className="inline-flex items-center border border-border" role="group" aria-label={`Quantity of ${label}`}>
      <button
        type="button"
        onClick={() => onStep(-1)}
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
        onClick={() => onStep(1)}
        disabled={max}
        aria-label={`Increase quantity of ${label}`}
        className="grid size-11 place-items-center transition-colors duration-200 hover:bg-sand active:bg-sand disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Plus className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** The sizes or colours of one group: chips the customer can tick, one or several. */
function Kind({ view, kind, sel, idPrefix }: { view: GroupView; kind: GroupView["kinds"][number]; sel: OptionSelection; idPrefix: string }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm">
        {kind.label}
        {kind.chosen.length > 0 && <span className="ml-2 text-muted-foreground">{kind.chosen.join(", ")}</span>}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {kind.values.map((value) => {
          const on = kind.chosen.includes(value);
          return (
            <label key={value} className="relative">
              <input
                type="checkbox"
                name={`${idPrefix}-${view.group.id}-${kind.kind}`}
                checked={on}
                onChange={() => sel.toggle(view.group.id, kind.kind, value)}
                className="peer sr-only"
              />
              <span className={cn(chipBase, on ? chipOn : chipOff)}>
                <span className="inline-flex items-center gap-1.5">
                  {on && <Check className="size-3.5" strokeWidth={2} aria-hidden="true" />}
                  {value}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * The choices for a product: each variant group with its sizes and colours (several can be ticked), then what was
 * chosen with a quantity for each, then a note about what is running low. A product with no groups only gets a
 * quantity.
 */
export function OptionPicker({
  product,
  sel,
  idPrefix,
  stockNote = true,
}: {
  product: ProductDetail;
  sel: OptionSelection;
  idPrefix: string;
  /** Show "Only N left in stock" under the choices. Off where a stock line is already shown nearby. */
  stockNote?: boolean;
}) {
  const low = sel.stock > 0 && sel.stock <= LOW_STOCK_THRESHOLD;

  return (
    <div className="space-y-5">
      {sel.hasGroups && (
        <div className="divide-y divide-border">
          {sel.views.map((view) => (
            <div key={view.group.id} className="space-y-5 py-5 first:pt-0 last:pb-0">
              <h3 className="font-heading text-xl leading-tight">{view.group.heading}</h3>
              {view.kinds.map((kind) => (
                <Kind key={kind.kind} view={view} kind={kind} sel={sel} idPrefix={idPrefix} />
              ))}
            </div>
          ))}
        </div>
      )}

      {sel.hasGroups && sel.lines.length === 0 && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Choose one or more {sel.views.some((v) => v.kinds.length > 1) ? "sizes and colours" : "options"}, then set how many of each. The price adds up.
        </p>
      )}

      {/* A product with nothing to choose: just how many. */}
      {!sel.hasGroups && !sel.soldOut && sel.stock > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm">Quantity</span>
          <Stepper qty={sel.lines[0]?.qty ?? 1} max={(sel.lines[0]?.qty ?? 1) >= Math.min(sel.stock, 10)} label={product.name} onStep={(d) => sel.stepQty("plain", d)} />
        </div>
      )}

      {sel.hasGroups && sel.lines.length > 0 && (
        <section aria-label="Your selection" className="text-sm">
          <p className="mb-2 flex flex-wrap justify-between gap-x-3">
            <span>Your selection</span>
            <span className="text-muted-foreground" aria-live="polite">
              {piecesLabel(sel.pieces)}, {formatPKR(sel.total)}
            </span>
          </p>
          <ul className="divide-y divide-border border border-border bg-surface">
            {sel.lines.map((line) => {
              const atMax = line.qty >= 10 || sel.pieces >= sel.stock;
              return (
                <li key={line.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3">
                  <div className="min-w-0">
                    <p>{line.label}</p>
                    <p className="text-xs text-muted-foreground">{formatPKR(product.price)} each</p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <Stepper qty={line.qty} max={atMax} label={line.label} onStep={(d) => sel.stepQty(line.key, d)} />
                    <p className="min-w-[4.5rem] text-right font-medium">{formatPKR(product.price * line.qty)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {sel.overStock ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              Only {sel.stock} {sel.stock === 1 ? "piece is" : "pieces are"} in stock. Lower a quantity or remove a choice to continue.
            </p>
          ) : (
            sel.pieces >= sel.stock &&
            sel.stock > 1 && <p className="mt-2 text-xs text-muted-foreground">That is everything in stock.</p>
          )}
        </section>
      )}

      {stockNote && low && (
        <p aria-live="polite" className="text-sm text-gold-hover">
          Only {sel.stock} left in stock
        </p>
      )}
    </div>
  );
}
