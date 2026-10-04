"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { GiftOffer, SiteSettings } from "@/lib/data/types";
import type { ShippingConfig } from "@/lib/pricing";

type StoreContextValue = {
  settings: SiteSettings;
  giftOffer: GiftOffer | null;
  shipping: ShippingConfig;
};

const StoreContext = createContext<StoreContextValue | null>(null);

/** Server-fetched, cached site settings made available to client components (cart, checkout). */
export function StoreProvider({
  settings,
  giftOffer,
  children,
}: {
  settings: SiteSettings;
  giftOffer: GiftOffer | null;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      settings,
      giftOffer,
      shipping: { flat: settings.shippingFlat, freeThreshold: settings.freeShippingThreshold },
    }),
    [settings, giftOffer],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
