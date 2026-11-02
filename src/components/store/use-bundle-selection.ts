"use client";

import { useMemo, useState } from "react";
import { attrOf, DIM_LABEL, type Dim } from "@/components/store/use-variant-selection";
import { cartActions, type BundlePiece } from "@/lib/cart-store";
import type { ProductDetail, ProductVariant } from "@/lib/data/types";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";
import { composeChosenName } from "@/lib/variant-name";

/** Size comes first, then design, then colour, so the colours offered are the ones that exist in the chosen size. */
const ORDER: Dim[] = ["size", "design", "colour"];

/** What one piece has been given so far: a value for each kind of choice answered, nothing for the rest. */
type Choice = Partial<Record<Dim, string | null>>;

export type PieceState = {
  index: number;
  /** "Nosering 1": how the piece is named on the product page, in the cart and on the order. */
  heading: string;
  /** The kinds of choice to show for this piece right now: those answered, then the next one waiting for an answer. */
  visible: Dim[];
  /** The next kind of choice waiting for an answer. Null once the piece is complete. */
  next: Dim | null;
  choice: Choice;
  /** The variant this piece comes to once everything is chosen. */
  variant: ProductVariant | null;
  /** What was chosen, in words: "Size 8mm, gold". */
  label: string;
};

/**
 * Selection for an offer that sells several pieces for one price ("any 2 noserings"). Each piece is chosen on its
 * own: a size first, then (once that is chosen) a colour, and a design if there is one. Pieces share the stock, so
 * two pieces cannot both take the last one of a size and colour. The price is the product price for the whole set.
 */
export function useBundleSelection(product: ProductDetail) {
  const count = Math.max(1, product.bundleSize);
  const { variants } = product;
  const pieceName = product.pieceName?.trim() || "Piece";

  /** The kinds of choice the pieces differ by. A kind with only one value is not a choice, so it is left out. */
  const dims = useMemo(
    () =>
      ORDER.flatMap((dim) => {
        const values = [...new Set(variants.map((v) => attrOf(v, dim)))].filter(
          (value) => value !== null || variants.some((x) => x.stock > 0 && attrOf(x, dim) === null),
        );
        return values.length > 1 ? [{ dim, values }] : [];
      }),
    [variants],
  );

  const [choices, setChoices] = useState<Choice[]>(() => Array.from({ length: count }, () => ({})));

  /** Does a variant match what a piece has chosen? `skip` leaves one kind out of the check. */
  const matches = (v: ProductVariant, choice: Choice, skip?: Dim) =>
    dims.every(({ dim }) => dim === skip || choice[dim] === undefined || attrOf(v, dim) === choice[dim]);

  /** The variant a piece comes to once everything is chosen: the one that matches, with stock, that has the most. */
  const variantOf = (choice: Choice): ProductVariant | null => {
    if (dims.some(({ dim }) => choice[dim] === undefined)) return null;
    const fits = variants.filter((v) => matches(v, choice) && v.stock > 0);
    return fits.length ? fits.reduce((best, v) => (v.stock > best.stock ? v : best)) : null;
  };

  const pieces: PieceState[] = choices.map((choice, index) => {
    const nextIndex = dims.findIndex(({ dim }) => choice[dim] === undefined);
    const variant = variantOf(choice);
    const shown = nextIndex === -1 ? dims : dims.slice(0, nextIndex + 1);
    const parts = dims.map((d) => d.dim);
    return {
      index,
      heading: `${pieceName} ${index + 1}`,
      visible: shown.map((d) => d.dim),
      next: nextIndex === -1 ? null : dims[nextIndex].dim,
      choice,
      variant,
      label: variant ? composeChosenName(variant, parts) : "",
    };
  });

  /** How many of each variant the other pieces have already taken. */
  const takenByOthers = (index: number) => {
    const taken = new Map<number, number>();
    pieces.forEach((p, i) => {
      if (i !== index && p.variant) taken.set(p.variant.id, (taken.get(p.variant.id) ?? 0) + 1);
    });
    return taken;
  };

  /**
   * A value cannot be chosen when nothing with it is left in stock once the other pieces have taken theirs. Only
   * what was chosen before it counts: choosing it again clears the answers after it.
   */
  function isDisabled(index: number, dim: Dim, value: string | null) {
    const taken = takenByOthers(index);
    const earlier = dims.slice(0, dims.findIndex((d) => d.dim === dim)).map((d) => d.dim);
    return !variants.some(
      (v) =>
        attrOf(v, dim) === value &&
        earlier.every((d) => choices[index][d] === undefined || attrOf(v, d) === choices[index][d]) &&
        v.stock - (taken.get(v.id) ?? 0) > 0,
    );
  }

  /** Chooses a value for a piece. Anything chosen after it is cleared, because it may no longer exist for the new choice. */
  function choose(index: number, dim: Dim, value: string | null) {
    setChoices((cur) =>
      cur.map((choice, i) => {
        if (i !== index) return choice;
        const keep = dims.slice(0, dims.findIndex((d) => d.dim === dim));
        const next: Choice = {};
        for (const { dim: d } of keep) next[d] = choice[d];
        next[dim] = value;
        return next;
      }),
    );
  }

  const complete = pieces.every((p) => p.variant !== null);
  /** The first piece still waiting for an answer, for the button text. */
  const waiting = pieces.find((p) => p.variant === null) ?? null;
  const soldOut = variants.every((v) => v.stock < 1);

  /** How many sets of these pieces the stock allows (each set uses one of each chosen variant per time it appears). */
  const maxSets = () => {
    const uses = new Map<number, number>();
    for (const p of pieces) if (p.variant) uses.set(p.variant.id, (uses.get(p.variant.id) ?? 0) + 1);
    let most = MAX_QTY_PER_LINE;
    for (const [id, n] of uses) {
      const stock = variants.find((v) => v.id === id)?.stock ?? 0;
      most = Math.min(most, Math.floor(stock / n));
    }
    return Math.max(0, most);
  };

  /** Puts the chosen set in the cart as one line. Returns how many pieces were added (0 if it is not complete). */
  function add() {
    if (!complete) return 0;
    const chosen: BundlePiece[] = pieces.map((p) => ({
      variantId: p.variant!.id,
      heading: p.heading,
      label: p.label,
    }));
    cartActions.addBundle(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images[0]?.url ?? null,
        stock: maxSets(),
      },
      chosen,
    );
    return count;
  }

  return {
    count,
    pieceName,
    dims: dims.map((d) => ({ ...d, label: DIM_LABEL[d.dim] })),
    pieces,
    isDisabled,
    choose,
    complete,
    waiting,
    soldOut,
    canAdd: complete && !soldOut,
    total: product.price,
    add,
  };
}

export type BundleSelection = ReturnType<typeof useBundleSelection>;
