"use client";

import { Check, Minus, Plus, Trash2 } from "lucide-react";
import type { GroupView, OptionSelection } from "@/components/store/use-option-selection";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import type { ProductDetail } from "@/lib/data/types";
import { optionLines } from "@/lib/option-label";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { cn, formatPKR } from "@/lib/utils";

const chipBase =
  "grid min-h-11 min-w-12 cursor-pointer place-items-center border px-4 py-1.5 text-center text-sm leading-tight transition-[border-color,background-color,transform] duration-200 ease-(--ease-out) active:scale-[0.97] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold";
const chipOn = "border-foreground bg-foreground text-background";
const chipOff = "border-border bg-surface hover:border-gold";

/** "a size", "a colour" or "a size and colour for Nose Ring 1": for button text like "Select a size". */
export const choiceNoun = (sel: OptionSelection) => sel.missing ?? "an option";

/**
 * The product's actual price, configured in the admin panel and shown under the title.
 * It never increases with variant selections: both/all variants are included in this price.
 */
export function SelectionPrice({ product, className }: { product: ProductDetail; className?: string }) {
  return <Price price={product.price} compareAt={product.compareAtPrice} className={className} />;
}

/** A quantity stepper with - and + buttons. */
function Stepper({
  qty,
  max,
  label,
  onStep,
}: {
  qty: number;
  max: boolean;
  label: string;
  onStep: (delta: 1 | -1) => void;
}) {
  return (
    <div className="inline-flex items-center border border-border" role="group" aria-label={`Quantity of ${label}`}>
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={qty <= 1}
        aria-label={`Decrease quantity of ${label}`}
        className="grid size-10 place-items-center transition-colors duration-200 hover:bg-sand active:bg-sand disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Minus className="size-3.5" strokeWidth={1.5} />
      </button>
      <span className="min-w-8 text-center tabular-nums font-medium text-sm" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={max}
        aria-label={`Increase quantity of ${label}`}
        className="grid size-10 place-items-center transition-colors duration-200 hover:bg-sand active:bg-sand disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Plus className="size-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** The sizes or colours of one variant: exactly one can be selected per kind. */
function Kind({ view, kind, sel, idPrefix }: { view: GroupView; kind: GroupView["kinds"][number]; sel: OptionSelection; idPrefix: string }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm">
        {kind.label}
        {kind.chosen && <span className="ml-2 font-medium text-foreground">{kind.chosen}</span>}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {kind.values.map((value) => {
          const on = kind.chosen === value;
          return (
            <label key={value} className="relative">
              <input
                type="radio"
                name={`${idPrefix}-${view.group.id}-${kind.kind}`}
                value={value}
                checked={on}
                onChange={() => sel.toggle(view.group.id, kind.kind, value)}
                onClick={() => {
                  if (on) sel.toggle(view.group.id, kind.kind, value);
                }}
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
 * The choices for a product:
 * - Each variant group (Nose Ring 1, Nose Ring 2) is shown separately.
 * - Customer selects exactly one size and one color per variant. Both selections are mandatory.
 * - The original product price is unchanged by selections.
 * - After selecting, a button below allows making another selection for a different size/color.
 * - Total = Product Price × Total Quantity across all selections.
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
  stockNote?: boolean;
}) {
  const low = sel.stock > 0 && sel.stock <= LOW_STOCK_THRESHOLD;

  return (
    <div className="space-y-6">
      {/* List of previously configured selections */}
      {sel.hasGroups && sel.savedUnits.length > 0 && (
        <section aria-label="Configured selections" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your selections ({sel.savedUnits.length})
            </span>
          </div>
          <ul className="divide-y divide-border border border-border bg-surface">
            {sel.savedUnits.map((u, i) => (
              <li key={u.id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-foreground">
                      Selection {i + 1}
                    </span>
                    {optionLines(u.label).map((line) => (
                      <p key={line} className="mt-0.5 text-xs text-muted-foreground">
                        {line}
                      </p>
                    ))}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatPKR(product.price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => sel.editUnit(u.id)}
                      className="px-2.5 py-1 text-xs border border-border hover:border-gold hover:text-foreground transition-colors rounded-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => sel.removeUnit(u.id)}
                      aria-label={`Remove Selection ${i + 1}`}
                      className="grid size-7 place-items-center text-muted-foreground hover:text-danger hover:bg-sand transition-colors rounded-sm"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">Quantity</span>
                  <div className="flex items-center gap-2">
                    <Stepper
                      qty={u.qty}
                      max={sel.totalQty >= Math.min(sel.stock, 10)}
                      label={`Selection ${i + 1}`}
                      onStep={(d) => sel.stepUnitQty(u.id, d)}
                    />
                    <span className="min-w-16 text-right text-xs font-medium">
                      {formatPKR(product.price * u.qty)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Active variant customization picker */}
      {sel.hasGroups && (
        <div className="space-y-5">
          {sel.savedUnits.length > 0 && (
            <div className="flex items-center justify-between border-b border-border pb-2 pt-1">
              <span className="text-sm font-semibold">
                {sel.editingId ? "Edit selection" : `Selection ${sel.savedUnits.length + 1} (Different size / colour)`}
              </span>
              {!sel.editingId && (
                <button
                  type="button"
                  onClick={sel.cancelNewUnit}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Cancel this selection
                </button>
              )}
            </div>
          )}

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

          {!sel.currentAllSelected && (
            <p className="-mt-1 text-xs text-muted-foreground">
              Select one {sel.views.some((v) => v.kinds.length > 1) ? "size and colour" : "option"} for each variant above. Both are included in the price.
            </p>
          )}

          {/* Stepper for the current active selection */}
          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <span className="text-sm font-medium">
              {sel.savedUnits.length > 0 ? "Quantity for this selection" : "Quantity"}
            </span>
            <div className="flex items-center gap-3">
              <Stepper
                qty={sel.currentQty}
                max={sel.totalQty >= Math.min(sel.stock, 10)}
                label={product.name}
                onStep={(d) => sel.stepQty(d)}
              />
              <span className="min-w-[4.5rem] text-right font-medium text-sm">
                {formatPKR(product.price * sel.currentQty)}
              </span>
            </div>
          </div>

          {/* Button below selection to make another selection for different color/size */}
          {sel.currentAllSelected && (
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={sel.addUnit}
                className="w-full"
              >
                <Plus className="size-4" strokeWidth={1.5} />
                {sel.editingId ? "Save changes to selection" : "Make another selection"}
              </Button>
              <p className="mt-1.5 text-center text-xs text-muted-foreground">
                Click to add another set with a different size and colour.
              </p>
            </div>
          )}
        </div>
      )}

      {/* For products with no groups: just quantity stepper */}
      {!sel.hasGroups && !sel.soldOut && (
        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          <span className="text-sm font-medium">Quantity</span>
          <div className="flex items-center gap-3">
            <Stepper
              qty={sel.qty}
              max={sel.qty >= Math.min(sel.stock, 10)}
              label={product.name}
              onStep={(d) => sel.stepQty(d)}
            />
            <span className="min-w-[4.5rem] text-right font-medium">
              {formatPKR(sel.total)}
            </span>
          </div>
        </div>
      )}

      {/* Total order summary line when multiple selections exist */}
      {sel.hasGroups && sel.savedUnits.length > 0 && !sel.soldOut && (
        <div className="flex items-center justify-between gap-4 border-t border-border pt-4 bg-sand/30 p-3 rounded-sm">
          <div>
            <span className="text-sm font-semibold">Total</span>
            <p className="text-xs text-muted-foreground">
              {sel.totalQty} {sel.totalQty === 1 ? "set" : "sets"} in total
            </p>
          </div>
          <span className="font-heading text-2xl font-semibold">
            {formatPKR(sel.total)}
          </span>
        </div>
      )}

      {sel.overStock ? (
        <p role="alert" className="text-xs text-danger">
          Only {sel.stock} {sel.stock === 1 ? "piece is" : "pieces are"} in stock. Lower the quantity to continue.
        </p>
      ) : (
        sel.totalQty >= sel.stock &&
        sel.stock > 1 && <p className="text-xs text-muted-foreground">That is everything in stock.</p>
      )}

      {stockNote && low && (
        <p aria-live="polite" className="text-sm text-gold-hover">
          Only {sel.stock} left in stock
        </p>
      )}
    </div>
  );
}
