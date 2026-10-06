"use client";

import { useMemo, useState } from "react";
import { cartActions } from "@/lib/cart-store";
import type { ProductDetail, ProductVariant } from "@/lib/data/types";

/** Price of one variant: its own price when the owner set one, otherwise the product price. */
export const variantPrice = (product: ProductDetail, v: ProductVariant) => v.priceOverride ?? product.price;

/**
 * Everything a product page or quick view needs to let a customer choose what to buy.
 *
 * - Variants can have a colour. When there are several colours the customer picks a colour first and
 *   then a size, design or option from that colour. When every colour is a single variant, the colours
 *   themselves are the choices.
 * - Normally one variant is chosen. When the product allows it (`allowMultiple`), several can be
 *   chosen at once, and the price is the total of the ones picked.
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
  // A single choice starts on the first piece in stock. With several allowed, the customer starts from nothing.
  const [ids, setIds] = useState<number[]>(multi || !firstAvailable ? [] : [firstAvailable.id]);

  const chips = useMemo(
    () => (!showColourPicker ? variants : variants.filter((v) => (v.color ?? null) === colour)),
    [variants, showColourPicker, colour],
  );
  const selected = useMemo(() => variants.filter((v) => ids.includes(v.id)), [variants, ids]);

  const total = selected.reduce((n, v) => n + variantPrice(product, v), 0);
  const soldOut = variants.every((v) => v.stock < 1);
  const canAdd = selected.length > 0 && selected.every((v) => v.stock > 0);

  function chooseColour(next: string | null) {
    setColour(next);
    if (multi) return;
    // One variant at a time: move to the first piece in stock in that colour.
    const inColour = variants.filter((v) => (v.color ?? null) === next);
    const pick = inColour.find((v) => v.stock > 0) ?? inColour[0];
    setIds(pick ? [pick.id] : []);
  }

  function choose(id: number) {
    setIds(multi ? (cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id]);
  }

  /** Puts every chosen variant in the bag. Returns how many were added. */
  function add() {
    if (!canAdd) return 0;
    for (const v of selected) {
      cartActions.add({
        variantId: v.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variantName: v.name,
        price: variantPrice(product, v),
        image: product.images[0]?.url ?? null,
        stock: v.stock,
      });
    }
    return selected.length;
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
    ids,
    selected,
    /** The chosen variant when only one can be chosen. */
    variant: selected[0] as ProductVariant | undefined,
    total,
    soldOut,
    canAdd,
    choose,
    add,
  };
}

export type VariantSelection = ReturnType<typeof useVariantSelection>;
