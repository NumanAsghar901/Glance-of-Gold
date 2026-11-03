"use client";

import { useMemo, useSyncExternalStore } from "react";
import { composeOptionLabel, optionLines } from "@/lib/option-label";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";

/**
 * Cart kept in localStorage. Prices stored here are only for display; the
 * server re-prices every line when the order is placed.
 *
 * A line is one choice: a product, and (when it has variant groups) the combined
 * variant selections chosen for that complete product unit.
 * All lines of a product draw on the product's one stock number.
 */

export type CartOptionChoice = {
  group: string;
  size: string | null;
  colour: string | null;
};

export type CartLine = {
  /** Identifies the line: the product and what was chosen from its groups. See `lineKey`. */
  key: string;
  productId: number;
  slug: string;
  name: string;
  /** When a product has variant groups, all chosen variant options are saved together. */
  options?: CartOptionChoice[] | null;
  /** The variant group, size and colour chosen (for backwards compatibility / single group). */
  group?: string | null;
  size?: string | null;
  colour?: string | null;
  price: number;
  image: string | null;
  qty: number;
  /** Pieces of the product in stock, shared by all its lines. */
  stock: number;
};

export type AppliedCoupon = { code: string; discount: number; freeShipping: boolean };

type CartState = {
  lines: CartLine[];
  giftProductId: number | null;
  coupon: AppliedCoupon | null;
  drawerOpen: boolean;
};

/** Changing the shape of a line means a new key: an older bag is ignored rather than misread. */
const STORAGE_KEY = "gog-cart-v2";
const EMPTY: CartState = { lines: [], giftProductId: null, coupon: null, drawerOpen: false };

type Choice = {
  productId: number;
  options?: CartOptionChoice[] | null;
  group?: string | null;
  size?: string | null;
  colour?: string | null;
};

/** The identity of a line: the product plus what was chosen from its groups. */
export const lineKey = (c: Choice) => {
  if (c.options && c.options.length > 0) {
    const opts = c.options
      .map((o) => `${o.group}:${o.size ?? ""}:${o.colour ?? ""}`)
      .join(";");
    return `p${c.productId}|${opts}`;
  }
  return `p${c.productId}|${c.group ?? ""}|${c.size ?? ""}|${c.colour ?? ""}`;
};

/** The choice written out for the bag, checkout and orders: "Nose Ring 1: Size 6mm, Gold · Nose Ring 2: Size 8mm, Silver". */
export const lineLabel = (l: Choice) => composeOptionLabel(l);

/** What to show under a line's name, one line per part. */
export const lineDetails = (l: Choice) => optionLines(lineLabel(l));

let state: CartState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    const { lines, giftProductId, coupon } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, giftProductId, coupon }));
  } catch {
    /* storage unavailable (private mode): cart still works for this visit */
  }
}

const isLine = (l: unknown): l is CartLine =>
  !!l && typeof l === "object" && typeof (l as CartLine).key === "string" && typeof (l as CartLine).productId === "number";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<CartState>;
    if (Array.isArray(parsed.lines)) {
      state = {
        lines: parsed.lines.filter(isLine),
        giftProductId: parsed.giftProductId ?? null,
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

/** How many of a product the other lines already hold, so no line takes more than the product has. */
const heldByOthers = (lines: CartLine[], productId: number, key: string) =>
  lines.reduce((n, l) => (l.productId === productId && l.key !== key ? n + l.qty : n), 0);

/** The most a line can be: what the product has left after its other lines, and never more than a line allows. */
const room = (lines: CartLine[], line: Pick<CartLine, "productId" | "key" | "stock">) =>
  Math.max(0, Math.min(MAX_QTY_PER_LINE, line.stock - heldByOthers(lines, line.productId, line.key)));

/** Can this line take one more? Not if the product's other lines already hold what is left. */
export const canAddMore = (lines: CartLine[], line: CartLine) => room(lines, line) > line.qty;

// Actions -------------------------------------------------------------------

export const cartActions = {
  /** Puts a choice in the bag. The same choice again adds to its quantity. */
  add(line: Omit<CartLine, "qty" | "key">, qty = 1) {
    const key = lineKey(line);
    const existing = state.lines.find((l) => l.key === key);
    const base = { ...line, key };
    const lines = existing
      ? state.lines.map((l) => (l.key === key ? { ...l, ...base, qty: Math.min(l.qty + qty, room(state.lines, base)) } : l))
      : [...state.lines, { ...base, qty: Math.min(qty, room(state.lines, base)) }];
    set({ lines: lines.filter((l) => l.qty > 0), drawerOpen: true });
  },
  setQty(key: string, qty: number) {
    if (qty < 1) return cartActions.remove(key);
    set({
      lines: state.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(qty, room(state.lines, l)) } : l)),
    });
  },
  remove(key: string) {
    set({ lines: state.lines.filter((l) => l.key !== key) });
  },
  /** Refresh display data (price, stock) from the server; drop products that are gone or sold out. */
  sync(fresh: Map<number, { price: number; stock: number } | null>) {
    const kept = state.lines.flatMap((l) => {
      const f = fresh.get(l.productId);
      if (f === undefined) return [l];
      if (f === null || f.stock < 1) return [];
      return [{ ...l, price: f.price, stock: f.stock }];
    });
    // Everything bought of a product together cannot be more than it has: trim the later lines first.
    const taken = new Map<number, number>();
    const lines = kept.flatMap((l) => {
      const used = taken.get(l.productId) ?? 0;
      const qty = Math.min(l.qty, Math.max(0, l.stock - used));
      taken.set(l.productId, used + qty);
      return qty > 0 ? [{ ...l, qty }] : [];
    });
    set({ lines });
  },
  setGift(productId: number | null) {
    set({ giftProductId: productId });
  },
  setCoupon(coupon: AppliedCoupon | null) {
    set({ coupon });
  },
  clear() {
    set({ lines: [], giftProductId: null, coupon: null });
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
    const count = s.lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = s.lines.reduce((n, l) => n + l.price * l.qty, 0);
    return { ...s, count, subtotal };
  }, [s]);
}
