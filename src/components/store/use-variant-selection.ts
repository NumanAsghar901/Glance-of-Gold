"use client";

import { useMemo, useRef, useState } from "react";
import { cartActions } from "@/lib/cart-store";
import type { ProductDetail, ProductVariant } from "@/lib/data/types";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";
import { composeChosenName, type VariantPart } from "@/lib/variant-name";

/** Price of one variant: its own price when the owner set one, otherwise the product price. */
export const variantPrice = (product: ProductDetail, v: ProductVariant) => v.priceOverride ?? product.price;

/** Most a customer can take of one variant: what is in stock, and never more than the cart allows. */
export const maxQty = (v: ProductVariant) => Math.max(1, Math.min(v.stock, MAX_QTY_PER_LINE));

/** The three things a variant can differ by. Each one with more than one value gets its own picker. */
export type Dim = VariantPart;
/** The order they are shown in, top to bottom: colour, then size, then design. */
const ALL_DIMS: Dim[] = ["colour", "size", "design"];
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
  /** Only one value exists, so there is nothing to choose: it is just shown. */
  fixed: boolean;
};

export type SelectedLine = {
  /** Identifies the line among the others: the chosen values that make it up. */
  key: string;
  /** The variant stock and price come from (the one with the most in stock that matches). */
  variant: ProductVariant;
  qty: number;
  /** What the customer chose, for example "Size 6" when no design was chosen. */
  label: string;
  /** Which of colour, size and design the label covers. */
  parts: Dim[];
};

type Chosen = Record<Dim, (string | null)[]>;

/**
 * Everything a product page or quick view needs to let a customer choose what to buy.
 *
 * - Colour, size and design are separate pickers, shown only when a product has more than one value of that
 *   kind. A variant is one mix of them, with its own stock and price.
 * - Size and design are independent: the customer can choose only a size, only a design, or both. Something
 *   they leave out is "any": the order says only what they chose, and stock comes from a mix that has some.
 * - Normally one value of each is chosen, one piece. When the product allows it (`allowMultiple`), several
 *   sizes and designs can be chosen at once, and every mix becomes a line with its own quantity
 *   (size 4 x 3, size 2 x 2). The price is the total of all lines.
 */
export function useVariantSelection(product: ProductDetail) {
  const { variants } = product;
  const hasChoice = variants.length > 1;
  const multi = product.allowMultiple && hasChoice;

  const dims: DimInfo[] = useMemo(() => {
    const found = ALL_DIMS.flatMap((dim) => {
      // A leftover variant with no value of this kind is not offered once it is out of stock.
      const values = [...new Set(variants.map((v) => attrOf(v, dim)))].filter(
        (value) => value !== null || variants.some((x) => x.stock > 0 && attrOf(x, dim) === null),
      );
      return variants.some((v) => attrOf(v, dim) !== null) ? [{ dim, values }] : [];
    });
    const choosable = found.filter((d) => d.values.length > 1);
    const multiDims: Dim[] = !multi ? [] : choosable.some((d) => d.dim !== "colour") ? ["size", "design"] : ["colour"];
    return found.map((d) => ({
      ...d,
      label: DIM_LABEL[d.dim],
      multiSelect: multiDims.includes(d.dim),
      fixed: d.values.length === 1 && d.values[0] !== null,
    }));
  }, [variants, multi]);

  /** Sizes and designs the customer can choose between. */
  const independent = useMemo(() => dims.filter((d) => d.dim !== "colour" && !d.fixed), [dims]);
  /** With both a size and a design to choose, either may be left out, so a chosen one can be tapped again to clear it. */
  const canSkip = (dim: Dim) => independent.length === 2 && independent.some((d) => d.dim === dim) && !multi;

  const first = variants.find((v) => v.stock > 0) ?? variants[0];
  const [chosen, setChosen] = useState<Chosen>(() => {
    const init: Chosen = { colour: [], design: [], size: [] };
    for (const d of dims) {
      if (d.fixed) init[d.dim] = [d.values[0]];
      else if (d.multiSelect || !first) init[d.dim] = [];
      // Colour starts on the first one in stock. A single size or design does too, unless there is both a size and
      // a design to choose from: then the customer starts from nothing and picks what they want.
      else if (d.dim === "colour" || independent.length < 2) init[d.dim] = [attrOf(first, d.dim)];
    }
    return init;
  });
  const [qtyByKey, setQtyByKey] = useState<Record<string, number>>({});
  // Kept in step with qtyByKey so quick taps on + and - each count, even before the screen has updated.
  const qtyNow = useRef(qtyByKey);
  const [excluded, setExcluded] = useState<string[]>([]);

  /** Does a variant fit what is chosen? A kind with nothing chosen fits anything. `skip` leaves one kind out of the check. */
  const fits = (v: ProductVariant, c: Chosen, skip?: Dim) =>
    dims.every((d) => d.dim === skip || c[d.dim].length === 0 || c[d.dim].includes(attrOf(v, d.dim)));

  /** The first kind of choice still waiting for an answer. With both a size and a design, either one is enough. */
  const missing: Dim | "size-or-design" | null = useMemo(() => {
    if (dims.length === 0) return null;
    const colour = dims.find((d) => d.dim === "colour" && !d.fixed);
    if (colour && chosen.colour.length === 0) return "colour";
    if (independent.length > 0 && !independent.some((d) => chosen[d.dim].length > 0)) {
      return independent.length === 2 ? "size-or-design" : independent[0].dim;
    }
    return null;
  }, [dims, independent, chosen]);

  const lines: SelectedLine[] = useMemo(() => {
    if (variants.length === 0) return [];
    if (dims.length === 0) {
      const only = first;
      return only && only.stock > 0 ? [{ key: "only", variant: only, qty: Math.min(qtyByKey.only ?? 1, maxQty(only)), label: only.name, parts: [] }] : [];
    }
    if (missing) return [];
    // The kinds that have something chosen. One line for each different mix of those values.
    const active = dims.filter((d) => chosen[d.dim].length > 0);
    const groups = new Map<string, ProductVariant[]>();
    for (const v of variants) {
      if (!fits(v, chosen)) continue;
      const key = active.map((d) => `${d.dim}:${attrOf(v, d.dim) ?? ""}`).join("|");
      groups.set(key, [...(groups.get(key) ?? []), v]);
    }
    const parts = active.map((d) => d.dim);
    return [...groups].flatMap(([key, group]) => {
      const inStock = group.filter((v) => v.stock > 0);
      if (inStock.length === 0 || excluded.includes(key)) return [];
      const variant = inStock.reduce((best, v) => (v.stock > best.stock ? v : best));
      return [{ key, variant, qty: Math.min(qtyByKey[key] ?? 1, maxQty(variant)), label: composeChosenName(variant, parts), parts }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fits` only reads dims and chosen
  }, [variants, dims, chosen, missing, excluded, qtyByKey, first]);

  const pieces = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + variantPrice(product, l.variant) * l.qty, 0);
  const soldOut = variants.every((v) => v.stock < 1);
  const canAdd = lines.length > 0;
  /** Everything that fits what is chosen so far (all of it while nothing is chosen), for the "items left" count. */
  const scope = useMemo(() => variants.filter((v) => fits(v, chosen)), [variants, dims, chosen]); // eslint-disable-line react-hooks/exhaustive-deps
  /** What is chosen so far in words, for example "Size 6". Empty while nothing is chosen. */
  const scopeLabel = useMemo(() => {
    const parts = dims.filter((d) => chosen[d.dim].length > 0 && !d.fixed && !d.multiSelect).map((d) => d.dim);
    const sample = scope[0];
    return sample && parts.length ? composeChosenName(sample, parts) : "";
  }, [dims, chosen, scope]);

  /** A value cannot be chosen when nothing with it is in stock alongside what is already chosen. */
  function isDisabled(dim: Dim, value: string | null) {
    return !variants.some((v) => v.stock > 0 && attrOf(v, dim) === value && fits(v, chosen, dim));
  }

  /** The price that goes with a value, shown on its chip, when every piece with that value costs the same and it differs from the usual. */
  function valuePrice(dim: Dim, value: string | null): number | null {
    const prices = new Set(
      variants.filter((v) => attrOf(v, dim) === value && fits(v, chosen, dim)).map((v) => variantPrice(product, v)),
    );
    const [only] = [...prices];
    return prices.size === 1 && only !== product.price ? only : null;
  }

  /** Drops choices that the new selection has made impossible, so a chosen chip is never one that cannot be bought. */
  function prune(next: Chosen, changed: Dim): Chosen {
    const out: Chosen = { ...next };
    for (const d of dims) {
      if (d.dim === changed || d.fixed || out[d.dim].length === 0) continue;
      out[d.dim] = out[d.dim].filter((value) =>
        variants.some((v) => v.stock > 0 && attrOf(v, d.dim) === value && fits(v, out, d.dim)),
      );
    }
    return out;
  }

  /** Picks or un-picks a value. A single choice replaces the one before it, and can be tapped again to clear it when it may be skipped. */
  function toggleValue(dim: Dim, value: string | null) {
    setExcluded([]);
    setChosen((cur) => {
      const info = dims.find((d) => d.dim === dim);
      if (!info) return cur;
      const has = cur[dim].includes(value);
      let next: Chosen;
      if (info.multiSelect) next = { ...cur, [dim]: has ? cur[dim].filter((x) => x !== value) : [...cur[dim], value] };
      else if (has) next = canSkip(dim) ? { ...cur, [dim]: [] } : cur;
      else next = { ...cur, [dim]: [value] };
      return prune(next, dim);
    });
  }

  /** Takes one line out. A size or design nothing else uses any more is dropped from the choices too. */
  function removeLine(key: string) {
    const gone = lines.find((l) => l.key === key);
    if (!gone) return;
    const rest = lines.filter((l) => l.key !== key);
    setChosen((cur) => {
      const next = { ...cur };
      for (const d of dims) {
        if (!d.multiSelect) continue;
        const value = attrOf(gone.variant, d.dim);
        if (!rest.some((l) => attrOf(l.variant, d.dim) === value)) next[d.dim] = cur[d.dim].filter((x) => x !== value);
      }
      return next;
    });
    setExcluded((cur) => [...cur, key]);
  }

  /** One more or one fewer of a line, relative to what it is right now. Going below one removes it, like the cart does. */
  function stepQty(key: string, delta: 1 | -1) {
    const line = lines.find((l) => l.key === key);
    if (!line) return;
    const next = Math.min(qtyNow.current[key] ?? 1, maxQty(line.variant)) + delta;
    if (next < 1) {
      removeLine(key);
      return;
    }
    qtyNow.current = { ...qtyNow.current, [key]: Math.min(next, maxQty(line.variant)) };
    setQtyByKey(qtyNow.current);
  }

  /** Puts every line in the cart, with its quantity and what was chosen. Returns how many pieces were added. */
  function add() {
    if (!canAdd) return 0;
    for (const { variant, qty, label, parts } of lines) {
      cartActions.add(
        {
          variantId: variant.id,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          variantName: label,
          parts,
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
    canSkip,
    isDisabled,
    valuePrice,
    missing,
    scope,
    scopeLabel,
    /** Everything chosen, as lines with a quantity each. */
    lines,
    /** The chosen variant when only one can be chosen. */
    variant: lines[0]?.variant as ProductVariant | undefined,
    /** What is chosen, in words, when it comes to one line: "Size 6, Design 2". */
    chosenLabel: lines.length === 1 ? lines[0].label : "",
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
