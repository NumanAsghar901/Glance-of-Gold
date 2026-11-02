"use client";

import { useMemo, useSyncExternalStore } from "react";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";
import { variantLines, type VariantPart } from "@/lib/variant-name";

/**
 * Cart kept in localStorage. Prices stored here are only for display; the
 * server re-prices every line when the order is placed.
 */

/** One piece of an offer set ("any 2 noserings"): its own variant, named for the order, with what was chosen. */
export type BundlePiece = { variantId: number; heading: string; label: string };

export type CartLine = {
  /** Identifies the line in the bag. Bags saved before offers existed have none: use `lineKey`. */
  key?: string;
  /** For a set, the variant of its first piece. */
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  variantName: string;
  /** Which of colour, size and design the customer chose. Left out means all of them. */
  parts?: VariantPart[];
  /** For a set, the price of the whole set. */
  price: number;
  image: string | null;
  /** For a set, how many of these sets. */
  qty: number;
  /** For a set, how many sets the stock allows. */
  stock: number;
  /** The pieces of an offer set, each with the choices made for it. Absent for a normal line. */
  bundle?: BundlePiece[];
};

/** The identity of a line in the bag: a normal line is one variant, a set is one product with these exact pieces. */
export const lineKey = (l: Pick<CartLine, "key" | "variantId">) => l.key ?? `v${l.variantId}`;

/** What to show under a line's name: one line per choice ("Size 6"), or for a set one line per piece ("Nosering 1: Size 6mm, silver"). */
export function lineDetails(l: Pick<CartLine, "variantName" | "bundle">): string[] {
  return l.bundle ? l.bundle.map((p) => `${p.heading}: ${p.label}`) : variantLines(l.variantName);
}

/** How many sets the stock allows, when the same variant may appear in several pieces. */
function setsAllowed(pieces: BundlePiece[], stockOf: (variantId: number) => number) {
  const uses = new Map<number, number>();
  pieces.forEach((p) => uses.set(p.variantId, (uses.get(p.variantId) ?? 0) + 1));
  let most = MAX_QTY_PER_LINE;
  for (const [id, n] of uses) most = Math.min(most, Math.floor(stockOf(id) / n));
  return Math.max(0, most);
}

export type AppliedCoupon = { code: string; discount: number; freeShipping: boolean };

type CartState = {
  lines: CartLine[];
  giftVariantId: number | null;
  coupon: AppliedCoupon | null;
  drawerOpen: boolean;
};

const STORAGE_KEY = "gog-cart-v1";
const EMPTY: CartState = { lines: [], giftVariantId: null, coupon: null, drawerOpen: false };

let state: CartState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    const { lines, giftVariantId, coupon } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, giftVariantId, coupon }));
  } catch {
    /* storage unavailable (private mode): cart still works for this visit */
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<CartState>;
    if (Array.isArray(parsed.lines)) {
      state = {
        lines: parsed.lines,
        giftVariantId: parsed.giftVariantId ?? null,
        coupon: parsed.coupon ?? null,
        drawerOpen: false,
      };
    }
  } catch {
    /* corrupt data: start with an empty cart */
  }
}

function set(next: Partial<CartState>, save = true) {
  state = { ...state, ...next };
  if (save) persist();
  emit();
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    hydrated = true;
    load();
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        load();
        emit();
      }
    });
  }
  listeners.add(listener);
  // React re-reads the snapshot right after subscribing, so data loaded above
  // from localStorage shows up without an extra notification.
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY;

// Actions -------------------------------------------------------------------

export const cartActions = {
  add(line: Omit<CartLine, "qty" | "key" | "bundle">, qty = 1) {
    const key = lineKey(line);
    const existing = state.lines.find((l) => lineKey(l) === key);
    const max = Math.min(line.stock, MAX_QTY_PER_LINE);
    const lines = existing
      ? state.lines.map((l) => (lineKey(l) === key ? { ...l, ...line, qty: Math.min(l.qty + qty, max) } : l))
      : [...state.lines, { ...line, qty: Math.min(qty, max) }];
    set({ lines, drawerOpen: true });
  },
  /** Adds one set of an offer (for example any 2 noserings). The same pieces again make it 2 sets. */
  addBundle(base: Pick<CartLine, "productId" | "slug" | "name" | "price" | "image" | "stock">, pieces: BundlePiece[]) {
    const key = `b${base.productId}:${pieces.map((p) => p.variantId).sort((a, b) => a - b).join("-")}`;
    const max = Math.min(base.stock, MAX_QTY_PER_LINE);
    if (max < 1) return;
    const existing = state.lines.find((l) => lineKey(l) === key);
    const lines = existing
      ? state.lines.map((l) => (lineKey(l) === key ? { ...l, price: base.price, stock: max, qty: Math.min(l.qty + 1, max) } : l))
      : [
          ...state.lines,
          {
            ...base,
            key,
            variantId: pieces[0].variantId,
            variantName: pieces.map((p) => `${p.heading}: ${p.label}`).join("; "),
            stock: max,
            qty: 1,
            bundle: pieces,
          },
        ];
    set({ lines, drawerOpen: true });
  },
  setQty(key: string, qty: number) {
    if (qty < 1) return cartActions.remove(key);
    set({
      lines: state.lines.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(qty, l.stock, MAX_QTY_PER_LINE) } : l)),
    });
  },
  remove(key: string) {
    set({ lines: state.lines.filter((l) => lineKey(l) !== key) });
  },
  /** Refresh display data (price, stock) from the server; drop unavailable lines. */
  sync(fresh: Map<number, { price: number; stock: number } | null>) {
    const lines = state.lines.flatMap((l) => {
      if (l.bundle) {
        const known = l.bundle.map((p) => fresh.get(p.variantId));
        if (known.some((f) => f === undefined)) return [l];
        if (known.some((f) => f === null)) return [];
        const sets = setsAllowed(l.bundle, (id) => fresh.get(id)?.stock ?? 0);
        if (sets < 1) return [];
        return [{ ...l, price: known[0]!.price, stock: sets, qty: Math.min(l.qty, sets) }];
      }
      const f = fresh.get(l.variantId);
      if (f === undefined) return [l];
      if (f === null || f.stock < 1) return [];
      return [{ ...l, price: f.price, stock: f.stock, qty: Math.min(l.qty, f.stock, MAX_QTY_PER_LINE) }];
    });
    set({ lines });
  },
  setGift(variantId: number | null) {
    set({ giftVariantId: variantId });
  },
  setCoupon(coupon: AppliedCoupon | null) {
    set({ coupon });
  },
  clear() {
    set({ lines: [], giftVariantId: null, coupon: null });
  },
  openDrawer() {
    set({ drawerOpen: true }, false);
  },
  closeDrawer() {
    set({ drawerOpen: false }, false);
  },
};

// Hook ------------------------------------------------------------------------

export function useCart() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    // Pieces: a set of 2 noserings counts as 2 (the free-gift offer and the bag badge count pieces).
    const count = s.lines.reduce((n, l) => n + l.qty * (l.bundle?.length ?? 1), 0);
    const subtotal = s.lines.reduce((n, l) => n + l.price * l.qty, 0);
    return { ...s, count, subtotal };
  }, [s]);
}
