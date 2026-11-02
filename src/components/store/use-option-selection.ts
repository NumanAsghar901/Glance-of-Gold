"use client";

import { useMemo, useRef, useState } from "react";
import { cartActions } from "@/lib/cart-store";
import type { OptionGroup, ProductDetail } from "@/lib/data/types";
import { composeOptionLabel } from "@/lib/option-label";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";

export type Kind = "size" | "colour";

/** One choice the customer has made, with its own quantity. */
export type SelectedLine = {
  /** Identifies the line among the others: the group, size and colour. */
  key: string;
  groupId: number | null;
  group: string | null;
  size: string | null;
  colour: string | null;
  qty: number;
  /** "Nose Ring 1, Size 6mm, gold": what the bag and the order will say. */
  label: string;
};

type Chosen = { sizes: string[]; colours: string[] };

export type GroupView = {
  group: OptionGroup;
  /** The kinds of choice this group has, in the order they are shown. */
  kinds: { kind: Kind; label: string; values: string[]; chosen: string[] }[];
};

const keyOf = (groupId: number | null, size: string | null, colour: string | null) => `${groupId ?? ""}|${size ?? ""}|${colour ?? ""}`;

/**
 * Everything a product page or quick view needs to let a customer choose what to buy.
 *
 * - A product can have variant groups. Each group is a heading with sizes and colours; the customer may choose
 *   several sizes and several colours in a group, and every size and colour mix chosen becomes a line with its own
 *   quantity (+ and -). Groups are independent of each other.
 * - A product with no groups needs no choice: just a quantity.
 * - Stock is one number for the whole product, so all the lines together cannot be more than it has.
 * - Every piece costs the product price, so the total is the price times all the quantities.
 */
export function useOptionSelection(product: ProductDetail) {
  // A group with neither sizes nor colours has nothing to choose, so it is left out.
  const groups = useMemo(() => product.groups.filter((g) => g.sizes.length + g.colours.length > 0), [product.groups]);
  const hasGroups = groups.length > 0;

  // Nothing is chosen for the customer, even when a group has a single size or colour: a group only adds
  // something to the bag once the customer has chosen from it.
  const [chosen, setChosen] = useState<Record<number, Chosen>>({});
  const [qtyByKey, setQtyByKey] = useState<Record<string, number>>({});
  // Kept in step with qtyByKey so quick taps on + and - each count, even before the screen has updated.
  const qtyNow = useRef(qtyByKey);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [plainQty, setPlainQty] = useState(1);

  const stock = product.stock;
  const soldOut = stock < 1;

  const views: GroupView[] = groups.map((g) => ({
    group: g,
    kinds: [
      ...(g.sizes.length ? [{ kind: "size" as const, label: "Size", values: g.sizes, chosen: chosen[g.id]?.sizes ?? [] }] : []),
      ...(g.colours.length ? [{ kind: "colour" as const, label: "Colour", values: g.colours, chosen: chosen[g.id]?.colours ?? [] }] : []),
    ],
  }));

  /** Every size and colour mix chosen, one line each. A group with only sizes (or only colours) gives a line per value. */
  const lines: SelectedLine[] = useMemo(() => {
    if (!hasGroups) {
      return soldOut ? [] : [{ key: "plain", groupId: null, group: null, size: null, colour: null, qty: Math.min(plainQty, stock, MAX_QTY_PER_LINE), label: "" }];
    }
    return groups.flatMap((g) => {
      const c = chosen[g.id] ?? { sizes: [], colours: [] };
      const sizes: (string | null)[] = g.sizes.length ? c.sizes : [null];
      const colours: (string | null)[] = g.colours.length ? c.colours : [null];
      // Both kinds present means a line needs one of each; a missing kind means nothing is chosen yet.
      if ((g.sizes.length && c.sizes.length === 0) || (g.colours.length && c.colours.length === 0)) return [];
      return sizes.flatMap((size) =>
        colours.flatMap((colour) => {
          const key = keyOf(g.id, size, colour);
          if (excluded.includes(key)) return [];
          return [{ key, groupId: g.id, group: g.heading, size, colour, qty: Math.min(qtyByKey[key] ?? 1, MAX_QTY_PER_LINE), label: composeOptionLabel({ group: g.heading, size, colour }) }];
        }),
      );
    });
  }, [hasGroups, soldOut, plainQty, stock, groups, chosen, excluded, qtyByKey]);

  const pieces = lines.reduce((n, l) => n + l.qty, 0);
  const total = pieces * product.price;
  const overStock = pieces > stock;
  const canAdd = !soldOut && lines.length > 0 && !overStock;

  /** What is still needed before anything can be added, for the button text. */
  const missing: string | null = useMemo(() => {
    if (!hasGroups || lines.length > 0) return null;
    const needs = new Set<string>();
    for (const g of groups) {
      const c = chosen[g.id] ?? { sizes: [], colours: [] };
      if (g.sizes.length && c.sizes.length === 0) needs.add("size");
      if (g.colours.length && c.colours.length === 0) needs.add("colour");
    }
    return needs.size === 2 ? "a size and colour" : needs.has("size") ? "a size" : "a colour";
  }, [hasGroups, lines.length, groups, chosen]);

  /**
   * Picks or un-picks a size or colour in a group. Choosing a value again brings back a line of that group that was
   * removed by hand, and only that: lines of other groups and other values stay as the customer left them.
   */
  function toggle(groupId: number, kind: Kind, value: string) {
    setExcluded((cur) =>
      cur.filter((key) => {
        const [gid, size, colour] = key.split("|");
        return !(gid === String(groupId) && (kind === "size" ? size === value : colour === value));
      }),
    );
    setChosen((cur) => {
      const now = cur[groupId] ?? { sizes: [], colours: [] };
      const field = kind === "size" ? "sizes" : "colours";
      const has = now[field].includes(value);
      return { ...cur, [groupId]: { ...now, [field]: has ? now[field].filter((x) => x !== value) : [...now[field], value] } };
    });
  }

  /** Takes one line out. A size or colour no other line uses any more is dropped from the choices too. */
  function removeLine(key: string) {
    const gone = lines.find((l) => l.key === key);
    if (!gone) return;
    const rest = lines.filter((l) => l.key !== key);
    if (gone.groupId !== null) {
      setChosen((cur) => {
        const now = cur[gone.groupId!];
        if (!now) return cur;
        const usedSize = rest.some((l) => l.groupId === gone.groupId && l.size === gone.size);
        const usedColour = rest.some((l) => l.groupId === gone.groupId && l.colour === gone.colour);
        return {
          ...cur,
          [gone.groupId!]: {
            sizes: gone.size && !usedSize ? now.sizes.filter((x) => x !== gone.size) : now.sizes,
            colours: gone.colour && !usedColour ? now.colours.filter((x) => x !== gone.colour) : now.colours,
          },
        };
      });
    }
    setExcluded((cur) => [...cur, key]);
  }

  /** One more or one fewer of a line. Below one a line is removed, like the bag does. Never more than the stock. */
  function stepQty(key: string, delta: 1 | -1) {
    if (key === "plain") {
      setPlainQty((q) => Math.max(1, Math.min(q + delta, stock, MAX_QTY_PER_LINE)));
      return;
    }
    const line = lines.find((l) => l.key === key);
    if (!line) return;
    const current = Math.min(qtyNow.current[key] ?? 1, MAX_QTY_PER_LINE);
    const next = current + delta;
    if (next < 1) {
      removeLine(key);
      return;
    }
    // The other lines of this product already hold part of the stock.
    const others = pieces - line.qty;
    if (next > MAX_QTY_PER_LINE || others + next > stock) return;
    qtyNow.current = { ...qtyNow.current, [key]: next };
    setQtyByKey(qtyNow.current);
  }

  /** Puts every line in the bag, with its quantity and what was chosen. Returns how many pieces were added. */
  function add() {
    if (!canAdd) return 0;
    for (const l of lines) {
      cartActions.add(
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          group: l.group,
          size: l.size,
          colour: l.colour,
          price: product.price,
          image: product.images[0]?.url ?? null,
          stock,
        },
        l.qty,
      );
    }
    return pieces;
  }

  return {
    hasGroups,
    views,
    lines,
    pieces,
    total,
    stock,
    soldOut,
    overStock,
    canAdd,
    missing,
    toggle,
    stepQty,
    add,
  };
}

export type OptionSelection = ReturnType<typeof useOptionSelection>;
