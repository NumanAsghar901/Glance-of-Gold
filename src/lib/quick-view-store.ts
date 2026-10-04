"use client";

import { useSyncExternalStore } from "react";

/** Which product the quick-view dialog is showing (null = closed). One dialog serves every card. */
let current: string | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const quickView = {
  open(slug: string) {
    current = slug;
    emit();
  },
  close() {
    current = null;
    emit();
  },
};

export function useQuickView() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}
