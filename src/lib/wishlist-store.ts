"use client";

import { useSyncExternalStore } from "react";

/** Wishlist kept in localStorage as a list of product slugs. Product details are fetched fresh when shown. */

const STORAGE_KEY = "gog-wishlist-v1";
const EMPTY: readonly string[] = [];

let slugs: readonly string[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    slugs = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, 100) : EMPTY;
  } catch {
    slugs = EMPTY;
  }
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
  return () => listeners.delete(listener);
}

export const wishlistActions = {
  toggle(slug: string) {
    slugs = slugs.includes(slug) ? slugs.filter((s) => s !== slug) : [slug, ...slugs].slice(0, 100);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    } catch {
      /* storage unavailable: the heart still works for this visit */
    }
    emit();
  },
};

export function useWishlist() {
  return useSyncExternalStore(
    subscribe,
    () => slugs,
    () => EMPTY,
  );
}
