"use client";

import { useMemo, useSyncExternalStore } from "react";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";

/**
 * Cart kept in localStorage. Prices stored here are only for display; the
 * server re-prices every line when the order is placed.
 */

export type CartLine = {
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  variantName: string;
  price: number;
  image: string | null;
  qty: number;
  stock: number;
};

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
  add(line: Omit<CartLine, "qty">, qty = 1) {
    const existing = state.lines.find((l) => l.variantId === line.variantId);
    const max = Math.min(line.stock, MAX_QTY_PER_LINE);
    const lines = existing
      ? state.lines.map((l) =>
          l.variantId === line.variantId
            ? { ...l, ...line, qty: Math.min(l.qty + qty, max) }
            : l,
        )
      : [...state.lines, { ...line, qty: Math.min(qty, max) }];
    set({ lines, drawerOpen: true });
  },
  setQty(variantId: number, qty: number) {
    if (qty < 1) return cartActions.remove(variantId);
    set({
      lines: state.lines.map((l) =>
        l.variantId === variantId ? { ...l, qty: Math.min(qty, l.stock, MAX_QTY_PER_LINE) } : l,
      ),
    });
  },
  remove(variantId: number) {
    set({ lines: state.lines.filter((l) => l.variantId !== variantId) });
  },
  /** Refresh display data (price, stock) from the server; drop unavailable lines. */
  sync(fresh: Map<number, { price: number; stock: number } | null>) {
    const lines = state.lines.flatMap((l) => {
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
    const count = s.lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = s.lines.reduce((n, l) => n + l.price * l.qty, 0);
    return { ...s, count, subtotal };
  }, [s]);
}
