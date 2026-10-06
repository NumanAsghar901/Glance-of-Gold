"use client";

import { Gift, Minus, Plus, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { getCartSnapshot, previewCoupon } from "@/app/actions/cart";
import { useStore } from "@/components/store/store-provider";
import { Button } from "@/components/ui/button";
import { cartActions, useCart, type CartLine } from "@/lib/cart-store";
import { piecesLabel } from "@/lib/order-text";
import { variantLines } from "@/lib/variant-name";
import { amountToFreeShipping, shippingFor } from "@/lib/pricing";
import { cn, formatPKR } from "@/lib/utils";

// Sync ------------------------------------------------------------------------

/** Refresh price/stock of cart lines from the server while `active`. */
export function useCartSync(active: boolean) {
  const { lines } = useCart();
  const key = lines
    .map((l) => l.variantId)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!active || !key) return;
    let cancelled = false;
    getCartSnapshot(key.split(",").map(Number)).then((res) => {
      if (cancelled) return;
      cartActions.sync(
        new Map(
          Object.entries(res).map(([id, v]) => [Number(id), v ? { price: v.price, stock: v.stock } : null]),
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [active, key]);
}

// Derived totals --------------------------------------------------------------

export function useCartTotals() {
  const cart = useCart();
  const { shipping, giftOffer } = useStore();
  const coupon = cart.coupon;
  const discount = coupon ? Math.min(coupon.discount, cart.subtotal) : 0;
  const delivery = shippingFor(cart.subtotal, shipping, coupon?.freeShipping ?? false);
  const giftEligible = !!giftOffer && cart.count >= giftOffer.minItems;
  const gift =
    giftEligible && cart.giftVariantId
      ? (giftOffer.options.find((o) => o.variantId === cart.giftVariantId) ?? null)
      : null;
  return {
    ...cart,
    discount,
    delivery,
    total: cart.subtotal - discount + delivery,
    giftEligible,
    gift,
    giftOffer,
  };
}

// Quantity --------------------------------------------------------------------

export function QtyStepper({ line, size = "md" }: { line: CartLine; size?: "sm" | "md" }) {
  const btn = cn(
    "grid place-items-center transition-colors duration-200 hover:bg-sand disabled:opacity-40 disabled:hover:bg-transparent",
    size === "sm" ? "size-8" : "size-10",
  );
  return (
    <div className="inline-flex items-center border border-border" role="group" aria-label={`Quantity for ${line.name}`}>
      <button type="button" className={btn} aria-label="Decrease quantity" onClick={() => cartActions.setQty(line.variantId, line.qty - 1)}>
        <Minus className="size-3.5" strokeWidth={1.5} />
      </button>
      <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">
        {line.qty}
      </span>
      <button
        type="button"
        className={btn}
        aria-label="Increase quantity"
        disabled={line.qty >= line.stock}
        onClick={() => cartActions.setQty(line.variantId, line.qty + 1)}
      >
        <Plus className="size-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

// Lines -----------------------------------------------------------------------

export function CartLineItem({ line, onNavigate }: { line: CartLine; onNavigate?: () => void }) {
  return (
    <li className="flex gap-4 py-5">
      <Link
        href={`/product/${line.slug}`}
        onClick={onNavigate}
        className="relative block h-24 w-[4.75rem] shrink-0 overflow-hidden bg-sand"
      >
        {line.image && <Image src={line.image} alt="" fill sizes="80px" quality={60} className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/product/${line.slug}`} onClick={onNavigate} className="block truncate font-heading text-lg leading-tight hover:text-gold-hover">
              {line.name}
            </Link>
            {variantLines(line.variantName).map((part) => (
              <p key={part} className="mt-0.5 text-xs text-muted-foreground">
                {part}
              </p>
            ))}
            {line.qty > 1 && <p className="mt-0.5 text-xs text-muted-foreground">{formatPKR(line.price)} each</p>}
          </div>
          <button
            type="button"
            aria-label={`Remove ${line.name}`}
            onClick={() => cartActions.remove(line.variantId)}
            className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-sand hover:text-foreground"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="mt-auto flex items-end justify-between pt-3">
          <QtyStepper line={line} size="sm" />
          <p className="text-sm font-medium">{formatPKR(line.price * line.qty)}</p>
        </div>
      </div>
    </li>
  );
}

// Free delivery bar -----------------------------------------------------------

export function FreeShippingBar({ className }: { className?: string }) {
  const { subtotal } = useCart();
  const { shipping } = useStore();
  if (subtotal <= 0) return null;
  const remaining = amountToFreeShipping(subtotal, shipping);
  const progress = Math.min(1, subtotal / shipping.freeThreshold);

  return (
    <div className={className}>
      <p className="text-sm">
        {remaining > 0 ? (
          <>
            Add <strong className="font-medium">{formatPKR(remaining)}</strong> more for free delivery
          </>
        ) : (
          <>You have unlocked <strong className="font-medium">free delivery</strong></>
        )}
      </p>
      <div className="mt-2 h-px w-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progress to free delivery">
        <div
          className="h-[3px] -translate-y-px origin-left bg-gold transition-transform duration-500 ease-(--ease-out)"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}

// Free gift -------------------------------------------------------------------

export function GiftPicker({ className }: { className?: string }) {
  const { giftOffer, giftEligible, count, giftVariantId } = useCartTotals();
  if (!giftOffer) return null;

  if (!giftEligible) {
    const more = giftOffer.minItems - count;
    if (count === 0) return null;
    return (
      <p className={cn("flex items-center gap-2 bg-sand px-4 py-3 text-sm", className)}>
        <Gift className="size-4 shrink-0 text-gold-hover" strokeWidth={1.5} />
        Add {more} more {more === 1 ? "item" : "items"} to choose a free gift.
      </p>
    );
  }

  return (
    <fieldset className={cn("min-w-0 border border-border bg-sand/60 p-4", className)}>
      <legend className="flex items-center gap-2 px-2 text-sm font-medium">
        <Gift className="size-4 text-gold-hover" strokeWidth={1.5} />
        Choose your free gift
      </legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {giftOffer.options.map((o) => {
          const selected = giftVariantId === o.variantId;
          return (
            <label
              key={o.variantId}
              className={cn(
                "relative block cursor-pointer border bg-surface p-2 transition-[border-color,transform] duration-200 ease-(--ease-out) active:scale-[0.98]",
                selected ? "border-gold" : "border-border hover:border-gold",
              )}
            >
              <input
                type="radio"
                name="gift"
                className="peer sr-only"
                checked={selected}
                onChange={() => cartActions.setGift(o.variantId)}
              />
              <span className="absolute inset-0 border-2 border-transparent peer-focus-visible:border-gold" aria-hidden="true" />
              <span className="relative block aspect-[4/5] overflow-hidden bg-sand">
                {o.image && <Image src={o.image} alt="" fill sizes="120px" quality={75} className="object-cover" />}
              </span>
              <span className="mt-2 block text-xs leading-snug">{o.productName}</span>
              <span className={cn("mt-1 block text-xs", selected ? "text-gold-hover" : "text-muted-foreground")}>
                {selected ? "Selected" : "Free"}
              </span>
            </label>
          );
        })}
      </div>
      {giftVariantId && (
        <button type="button" onClick={() => cartActions.setGift(null)} className="mt-3 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Skip the gift
        </button>
      )}
    </fieldset>
  );
}

// Coupon ----------------------------------------------------------------------

export function CouponBox({ enabled = true, collapsible = false }: { enabled?: boolean; collapsible?: boolean }) {
  const { coupon, subtotal } = useCart();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const lastChecked = useRef<string>("");

  // Re-validate an applied coupon whenever the subtotal changes (discount can depend on it).
  useEffect(() => {
    if (!enabled || !coupon) return;
    const key = `${coupon.code}:${subtotal}`;
    if (lastChecked.current === key) return;
    lastChecked.current = key;
    previewCoupon(coupon.code, subtotal).then((r) => {
      if (r.ok) cartActions.setCoupon({ code: r.code, discount: r.discount, freeShipping: r.freeShipping });
      else {
        cartActions.setCoupon(null);
        setMessage(r.message);
      }
    });
  }, [enabled, coupon, subtotal]);

  if (coupon) {
    return (
      <div className="flex items-center justify-between gap-3 border border-border bg-sand/60 px-4 py-3 text-sm">
        <p>
          <span className="font-medium tracking-[0.12em]">{coupon.code}</span> applied.
          {coupon.discount > 0 && <> You save {formatPKR(coupon.discount)}.</>}
          {coupon.freeShipping && <> Delivery is free.</>}
        </p>
        <button type="button" onClick={() => { cartActions.setCoupon(null); setMessage(null); }} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Remove
        </button>
      </div>
    );
  }

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setMessage(null);
        start(async () => {
          const r = await previewCoupon(code, subtotal);
          if (r.ok) {
            cartActions.setCoupon({ code: r.code, discount: r.discount, freeShipping: r.freeShipping });
            setCode("");
          } else setMessage(r.message);
        });
      }}
    >
      <label htmlFor="coupon" className="text-sm text-muted-foreground">
        Coupon code
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby={message ? "coupon-msg" : undefined}
          className="h-11 min-w-0 flex-1 border border-border bg-surface px-3 text-sm uppercase tracking-[0.1em] placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:border-gold"
          placeholder="Enter code"
        />
        <Button type="submit" variant="outline" size="md" disabled={pending || !code.trim()}>
          {pending ? "Checking" : "Apply"}
        </Button>
      </div>
      {message && (
        <p id="coupon-msg" role="status" className="mt-2 text-sm text-danger">
          {message}
        </p>
      )}
    </form>
  );

  if (!collapsible) return form;
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
        Have a coupon code?
      </summary>
      <div className="mt-3">{form}</div>
    </details>
  );
}

// Totals ----------------------------------------------------------------------

export function CartTotals({ className }: { className?: string }) {
  const t = useCartTotals();
  return (
    <dl className={cn("space-y-2 text-sm", className)}>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotal ({piecesLabel(t.count)})</dt>
        <dd>{formatPKR(t.subtotal)}</dd>
      </div>
      {t.discount > 0 && (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Discount ({t.coupon?.code})</dt>
          <dd>-{formatPKR(t.discount)}</dd>
        </div>
      )}
      {t.gift && (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Free gift</dt>
          <dd className="truncate text-right">{t.gift.productName}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Delivery</dt>
        <dd>{t.delivery === 0 ? "Free" : formatPKR(t.delivery)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
        <dt>Total</dt>
        <dd>{formatPKR(t.total)}</dd>
      </div>
    </dl>
  );
}
