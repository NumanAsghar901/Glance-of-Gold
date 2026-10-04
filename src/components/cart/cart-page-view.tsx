"use client";

import { ShoppingBag } from "lucide-react";
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

export function CartPageView() {
  const cart = useCartTotals();
  useCartSync(true);

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-5 py-20 text-center">
        <ShoppingBag className="size-12 text-gold" strokeWidth={1} />
        <p className="font-heading text-3xl">Your bag is empty</p>
        <p className="text-sm text-muted-foreground">Discover pieces made to be noticed.</p>
        <Button href="/shop">Continue shopping</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
      <div>
        <FreeShippingBar className="mb-2" />
        <ul className="divide-y divide-border border-y border-border" aria-label="Items in your bag">
          {cart.lines.map((l) => (
            <CartLineItem key={l.variantId} line={l} />
          ))}
        </ul>
        <GiftPicker className="mt-6" />
      </div>
      <aside className="h-fit space-y-6 border border-border bg-surface p-5 sm:p-7 lg:sticky lg:top-28">
        <h2 className="font-heading text-2xl">Summary</h2>
        <CouponBox />
        <CartTotals />
        <Button href="/checkout" size="lg" className="w-full">
          Checkout
        </Button>
        <Button href="/shop" variant="link" className="mx-auto flex">
          Continue shopping
        </Button>
      </aside>
    </div>
  );
}
