"use client";

import { useMemo, useState } from "react";
import { cartActions } from "@/lib/cart-store";
import type { ProductDetail, ProductVariant } from "@/lib/data/types";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";

/** Price of one variant: its own price when the owner set one, otherwise the product price. */
export const variantPrice = (product: ProductDetail, v: ProductVariant) => v.priceOverride ?? product.price;

/** Most a customer can take of one variant: what is in stock, and never more than the bag allows. */
export const maxQty = (v: ProductVariant) => Math.max(1, Math.min(v.stock, MAX_QTY_PER_LINE));

export type SelectedLine = { variant: ProductVariant; qty: number };

/**
 * Everything a product page or quick view needs to let a customer choose what to buy.
 *
 * - Variants can have a colour. When there are several colours the customer picks a colour first and
 *   then a size, design or option from that colour. When every colour is a single variant, the colours
 *   themselves are the choices.
 * - Normally one variant is chosen, one piece. When the product allows it (`allowMultiple`), several
 *   can be chosen at once, each with its own quantity (size 4 x 3, size 2 x 2), and the price is the
 *   total of all of them.
 */
export function useVariantSelection(product: ProductDetail) {
  const { variants } = product;
  const hasChoice = variants.length > 1;
  const multi = product.allowMultiple && hasChoice;

  // Colour groups in the order the owner entered them. A group without a colour has the key null.
  const groups = useMemo(() => [...new Set(variants.map((v) => v.color ?? null))], [variants]);
  const hasColours = groups.some((g) => g !== null);
  // Every colour is one variant, so the colours are the choices and there is no second step.
  const colourOnly = hasColours && groups.every((g) => variants.filter((v) => (v.color ?? null) === g).length === 1);
  const showColourPicker = hasColours && groups.length > 1 && !colourOnly;
  // Exactly one colour for the whole product: just say what it is.
  const singleColour = hasColours && groups.length === 1 ? groups[0] : null;

  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [colour, setColour] = useState<string | null>(firstAvailable?.color ?? null);
  // What is chosen, in the order it was chosen. A single choice starts on the first piece in stock;
  // with several allowed the customer starts from nothing.
  const [picks, setPicks] = useState<{ id: number; qty: number }[]>(
    multi || !firstAvailable ? [] : [{ id: firstAvailable.id, qty: 1 }],
  );

  const chips = useMemo(
    () => (!showColourPicker ? variants : variants.filter((v) => (v.color ?? null) === colour)),
    [variants, showColourPicker, colour],
  );
  const lines: SelectedLine[] = useMemo(
    () =>
      picks.flatMap((p) => {
        const variant = variants.find((v) => v.id === p.id);
        return variant ? [{ variant, qty: Math.min(p.qty, maxQty(variant)) }] : [];
      }),
    [variants, picks],
  );
  const selected = useMemo(() => lines.map((l) => l.variant), [lines]);

  const pieces = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + variantPrice(product, l.variant) * l.qty, 0);
  const soldOut = variants.every((v) => v.stock < 1);
  const canAdd = lines.length > 0 && lines.every((l) => l.variant.stock > 0);

  function chooseColour(next: string | null) {
    setColour(next);
    if (multi) return;
    // One variant at a time: move to the first piece in stock in that colour.
    const inColour = variants.filter((v) => (v.color ?? null) === next);
    const pick = inColour.find((v) => v.stock > 0) ?? inColour[0];
    setPicks(pick ? [{ id: pick.id, qty: 1 }] : []);
  }

  /** Picks a variant. With several allowed it toggles that variant on or off, starting at one piece. */
  function choose(id: number) {
    setPicks(multi ? (cur) => (cur.some((p) => p.id === id) ? cur.filter((p) => p.id !== id) : [...cur, { id, qty: 1 }]) : [{ id, qty: 1 }]);
  }

  /** Sets how many of a chosen variant. Going below one removes it, like the bag does. */
  function setQty(id: number, qty: number) {
    const variant = variants.find((v) => v.id === id);
    if (!variant) return;
    if (qty < 1) {
      setPicks((cur) => cur.filter((p) => p.id !== id));
      return;
    }
    const next = Math.min(qty, maxQty(variant));
    setPicks((cur) => cur.map((p) => (p.id === id ? { ...p, qty: next } : p)));
  }

  /** One more or one fewer of a chosen variant, relative to what is chosen right now, so fast taps all count. */
  function stepQty(id: number, delta: 1 | -1) {
    const variant = variants.find((v) => v.id === id);
    if (!variant) return;
    setPicks((cur) =>
      cur.flatMap((p) => {
        if (p.id !== id) return [p];
        const next = p.qty + delta;
        return next < 1 ? [] : [{ ...p, qty: Math.min(next, maxQty(variant)) }];
      }),
    );
  }

  /** Puts everything chosen in the bag, with its quantity. Returns how many pieces were added. */
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
    hasColours,
    colourOnly,
    showColourPicker,
    singleColour,
    groups,
    colour,
    chooseColour,
    chips,
    /** Each chosen variant with how many of it. */
    lines,
    selected,
    /** The chosen variant when only one can be chosen. */
    variant: selected[0] as ProductVariant | undefined,
    /** Pieces in all, and what they cost together. */
    pieces,
    total,
    soldOut,
    canAdd,
    choose,
    setQty,
    stepQty,
    add,
  };
}

export type VariantSelection = ReturnType<typeof useVariantSelection>;
