"use client";

import { useMemo, useRef, useState } from "react";
import { cartActions } from "@/lib/cart-store";
import type { ProductDetail, ProductVariant } from "@/lib/data/types";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";

/** Price of one variant: its own price when the owner set one, otherwise the product price. */
export const variantPrice = (product: ProductDetail, v: ProductVariant) => v.priceOverride ?? product.price;

/** Most a customer can take of one variant: what is in stock, and never more than the cart allows. */
export const maxQty = (v: ProductVariant) => Math.max(1, Math.min(v.stock, MAX_QTY_PER_LINE));

/** The three things a variant can differ by. Each one with more than one value gets its own picker. */
export type Dim = "colour" | "design" | "size";
const ALL_DIMS: Dim[] = ["colour", "design", "size"];
export const DIM_LABEL: Record<Dim, string> = { colour: "Colour", design: "Design", size: "Size" };

export const attrOf = (v: ProductVariant, dim: Dim): string | null =>
  (dim === "colour" ? v.color : dim === "design" ? v.design : v.size) ?? null;

export type DimInfo = {
  dim: Dim;
  label: string;
  /** Values in the order the owner entered them. null means "no value", shown as Standard. */
  values: (string | null)[];
  /** True when the customer may pick several values of this one at once. */
  multiSelect: boolean;
};

export type SelectedLine = { variant: ProductVariant; qty: number };

type Chosen = Record<Dim, (string | null)[]>;

/**
 * Everything a product page or quick view needs to let a customer choose what to buy.
 *
 * - Colour, design and size are separate pickers, shown only when a product has more than one value of
 *   that kind. A variant is one combination of them, with its own stock and price.
 * - Normally one value of each is chosen, one piece. When the product allows it (`allowMultiple`), designs
 *   and sizes can be chosen several at once, and every combination becomes a line with its own quantity
 *   (size 4 x 3, size 2 x 2). The price is the total of all lines. Colour stays a single choice, unless
 *   colours are all there is to choose between.
 */
export function useVariantSelection(product: ProductDetail) {
  const { variants } = product;
  const hasChoice = variants.length > 1;
  const multi = product.allowMultiple && hasChoice;

  const dims: DimInfo[] = useMemo(() => {
    const found = ALL_DIMS.flatMap((dim) => {
      const values = [...new Set(variants.map((v) => attrOf(v, dim)))];
      return values.some((x) => x !== null) ? [{ dim, values }] : [];
    });
    const multiDims: Dim[] = !multi ? [] : found.some((d) => d.dim !== "colour") ? ["design", "size"] : ["colour"];
    return found.map((d) => ({ ...d, label: DIM_LABEL[d.dim], multiSelect: multiDims.includes(d.dim) }));
  }, [variants, multi]);
  const singleDims = useMemo(() => dims.filter((d) => !d.multiSelect), [dims]);

  const first = variants.find((v) => v.stock > 0) ?? variants[0];
  const [chosen, setChosen] = useState<Chosen>(() => {
    const init: Chosen = { colour: [], design: [], size: [] };
    // A single choice starts on the first piece in stock; with several allowed the customer starts from nothing.
    for (const d of dims) init[d.dim] = d.multiSelect || !first ? [] : [attrOf(first, d.dim)];
    return init;
  });
  const [qtyById, setQtyById] = useState<Record<number, number>>({});
  // Kept in step with qtyById so quick taps on + and - each count, even before the screen has updated.
  const qtyNow = useRef(qtyById);
  const [excluded, setExcluded] = useState<number[]>([]);

  // Every combination the current choices point at, in stock or not.
  const matching = useMemo(() => {
    if (variants.length === 0) return [];
    if (dims.length === 0) return [first];
    if (dims.some((d) => chosen[d.dim].length === 0)) return [];
    return variants.filter((v) => dims.every((d) => chosen[d.dim].includes(attrOf(v, d.dim))));
  }, [variants, dims, chosen, first]);

  const lines: SelectedLine[] = useMemo(
    () =>
      matching
        .filter((v) => v.stock > 0 && !excluded.includes(v.id))
        .map((variant) => ({ variant, qty: Math.min(qtyById[variant.id] ?? 1, maxQty(variant)) })),
    [matching, excluded, qtyById],
  );

  const pieces = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + variantPrice(product, l.variant) * l.qty, 0);
  const soldOut = variants.every((v) => v.stock < 1);
  const canAdd = lines.length > 0;
  /** The first kind of choice still waiting for an answer, such as the size. */
  const missing: Dim | null = dims.find((d) => chosen[d.dim].length === 0)?.dim ?? null;
  /** What the single-choice pickers narrow things down to: one variant, or all of a colour when sizes are many. */
  const scope = useMemo(
    () => variants.filter((v) => singleDims.every((d) => chosen[d.dim].includes(attrOf(v, d.dim)))),
    [variants, singleDims, chosen],
  );

  /** A value cannot be chosen when nothing with it is in stock (within the chosen colour, when sizes are many). */
  function isDisabled(dim: Dim, value: string | null) {
    return !variants.some(
      (v) =>
        v.stock > 0 &&
        attrOf(v, dim) === value &&
        (!multi || singleDims.every((o) => o.dim === dim || chosen[o.dim].includes(attrOf(v, o.dim)))),
    );
  }

  /** The price that goes with a value, shown on its chip, when every piece with that value costs the same and it differs from the usual. */
  function valuePrice(dim: Dim, value: string | null): number | null {
    const prices = new Set(
      variants
        .filter((v) => attrOf(v, dim) === value && singleDims.every((o) => o.dim === dim || chosen[o.dim].includes(attrOf(v, o.dim))))
        .map((v) => variantPrice(product, v)),
    );
    const [only] = [...prices];
    return prices.size === 1 && only !== product.price ? only : null;
  }

  /** Picks or un-picks a value. For single choices it also moves the other pickers along if the new mix has nothing in stock. */
  function toggleValue(dim: Dim, value: string | null) {
    setExcluded([]);
    setChosen((cur) => {
      const info = dims.find((d) => d.dim === dim);
      if (!info) return cur;
      if (info.multiSelect) {
        const has = cur[dim].includes(value);
        return { ...cur, [dim]: has ? cur[dim].filter((x) => x !== value) : [...cur[dim], value] };
      }
      const settled: Partial<Record<Dim, string | null>> = { [dim]: value };
      for (const d of singleDims) {
        if (d.dim === dim) continue;
        const fits = (candidate: string | null) =>
          variants.some(
            (v) =>
              v.stock > 0 &&
              attrOf(v, d.dim) === candidate &&
              (Object.entries(settled) as [Dim, string | null][]).every(([k, val]) => attrOf(v, k) === val),
          );
        const current = cur[d.dim][0] ?? null;
        settled[d.dim] = d.values.includes(current) && fits(current) ? current : (d.values.find(fits) ?? current);
      }
      const next = { ...cur };
      for (const d of singleDims) next[d.dim] = [settled[d.dim] ?? null];
      return next;
    });
  }

  /** Takes one line out. A design or size nothing else uses any more is dropped from the choices too. */
  function removeLine(id: number) {
    const gone = variants.find((v) => v.id === id);
    if (!gone) return;
    const rest = lines.filter((l) => l.variant.id !== id);
    setChosen((cur) => {
      const next = { ...cur };
      for (const d of dims) {
        if (!d.multiSelect) continue;
        const value = attrOf(gone, d.dim);
        if (!rest.some((l) => attrOf(l.variant, d.dim) === value)) next[d.dim] = cur[d.dim].filter((x) => x !== value);
      }
      return next;
    });
    setExcluded((cur) => [...cur, id]);
  }

  /** One more or one fewer of a line, relative to what it is right now. Going below one removes it, like the cart does. */
  function stepQty(id: number, delta: 1 | -1) {
    const variant = variants.find((v) => v.id === id);
    if (!variant) return;
    const next = Math.min(qtyNow.current[id] ?? 1, maxQty(variant)) + delta;
    if (next < 1) {
      removeLine(id);
      return;
    }
    qtyNow.current = { ...qtyNow.current, [id]: Math.min(next, maxQty(variant)) };
    setQtyById(qtyNow.current);
  }

  /** Puts every line in the cart, with its quantity. Returns how many pieces were added. */
  function add() {
    if (!canAdd) return 0;
    for (const { variant, qty } of lines) {
      cartActions.add(
        {
          variantId: variant.id,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          variantName: variant.name,
          price: variantPrice(product, variant),
          image: product.images[0]?.url ?? null,
          stock: variant.stock,
        },
        qty,
      );
    }
    return pieces;
  }

  return {
    multi,
    hasChoice,
    dims,
    chosen,
    toggleValue,
    isDisabled,
    valuePrice,
    missing,
    scope,
    /** Everything chosen, as lines with a quantity each. */
    lines,
    /** The chosen variant when only one can be chosen. */
    variant: lines[0]?.variant as ProductVariant | undefined,
    /** Pieces in all, and what they cost together. */
    pieces,
    total,
    soldOut,
    canAdd,
    /** The choices point at nothing that can be bought right now (and nothing was removed by hand). */
    unavailable: dims.length > 0 && missing === null && lines.length === 0 && excluded.length === 0,
    stepQty,
    add,
  };
}

export type VariantSelection = ReturnType<typeof useVariantSelection>;
