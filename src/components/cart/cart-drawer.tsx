"use client";

import { ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  CartLineItem,
  CartTotals,
  CouponBox,
  FreeShippingBar,
  GiftPicker,
  useCartSync,
  useCartTotals,
} from "@/components/cart/cart-parts";
import { Button } from "@/components/ui/button";
import { cartActions, useCart } from "@/lib/cart-store";

export function CartButton() {
  const { count } = useCart();
  return (
    <button
      type="button"
      onClick={cartActions.openDrawer}
      aria-label={count > 0 ? `Open bag, ${count} ${count === 1 ? "item" : "items"}` : "Open bag"}
      className="relative grid size-11 place-items-center rounded-full transition-colors duration-200 hover:bg-sand"
    >
      <ShoppingBag className="size-5" strokeWidth={1.5} />
      {count > 0 && (
        <span
          key={count}
          className="cart-badge absolute right-1 top-1 grid min-w-[1.125rem] place-items-center rounded-full bg-gold px-1 text-[0.625rem] font-medium leading-[1.125rem] text-foreground"
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function CartDrawer() {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const cart = useCartTotals();
  const open = cart.drawerOpen;
  useCartSync(open);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  // Close when navigating (e.g. to checkout).
  useEffect(() => {
    cartActions.closeDrawer();
  }, [pathname]);

  return (
    <dialog
      ref={ref}
      aria-label="Shopping bag"
      onClose={cartActions.closeDrawer}
      onClick={(e) => {
        if (e.target === ref.current) cartActions.closeDrawer();
      }}
      className="sheet-right m-0 ml-auto h-dvh max-h-dvh w-[min(26rem,100vw)] bg-background p-0 text-foreground"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-2xl">Your bag{cart.count > 0 && <span className="ml-2 text-base text-muted-foreground">({cart.count})</span>}</h2>
          <button
            type="button"
            onClick={cartActions.closeDrawer}
            aria-label="Close bag"
            className="grid size-11 place-items-center rounded-full transition-colors duration-200 hover:bg-sand"
          >
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <ShoppingBag className="size-10 text-gold" strokeWidth={1} />
            <p className="font-heading text-2xl">Your bag is empty</p>
            <p className="text-sm text-muted-foreground">Discover pieces made to be noticed.</p>
            <Button href="/shop" onClick={cartActions.closeDrawer}>
              Shop now
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              <FreeShippingBar className="pt-5" />
              <ul className="divide-y divide-border" aria-label="Items in your bag">
                {cart.lines.map((l) => (
                  <CartLineItem key={l.variantId} line={l} onNavigate={cartActions.closeDrawer} />
                ))}
              </ul>
              <GiftPicker className="mb-5" />
            </div>

            <div className="space-y-4 border-t border-border bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <CouponBox enabled={open} />
              <CartTotals />
              <Button href="/checkout" size="lg" className="w-full">
                Checkout
              </Button>
              <Link href="/cart" className="link-draw block text-center text-sm">
                View full bag
              </Link>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
