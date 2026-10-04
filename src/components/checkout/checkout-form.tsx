"use client";

import { Banknote, Landmark, Lock, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { placeOrder, type CheckoutState } from "@/app/actions/checkout";
import {
  CartTotals,
  CouponBox,
  GiftPicker,
  useCartSync,
  useCartTotals,
} from "@/components/cart/cart-parts";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { PROVINCES } from "@/lib/validators";
import { cn, formatPKR } from "@/lib/utils";

type Method = "cod" | "jazzcash" | "easypaisa" | "bank_transfer";

const METHOD_INFO: Record<Method, { label: string; hint: string; icon: typeof Banknote }> = {
  cod: { label: "Cash on delivery", hint: "Pay in cash when your order arrives.", icon: Banknote },
  jazzcash: { label: "JazzCash", hint: "Transfer to our JazzCash account, then send the transaction ID.", icon: Smartphone },
  easypaisa: { label: "Easypaisa", hint: "Transfer to our Easypaisa account, then send the transaction ID.", icon: Smartphone },
  bank_transfer: { label: "Bank transfer", hint: "Transfer to our bank account, then send the transaction ID.", icon: Landmark },
};

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm">
        {label}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (error?: string) =>
  cn(
    "h-12 w-full border bg-surface px-4 text-base transition-colors duration-200 placeholder:text-muted-foreground hover:border-gold focus-visible:border-gold sm:text-sm",
    error ? "border-danger" : "border-border",
  );

function SubmitButton({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending} aria-live="polite">
      <Lock />
      {pending ? "Placing your order..." : `Place order, ${formatPKR(total)}`}
    </Button>
  );
}

export function CheckoutForm({ transferMethods }: { transferMethods: Method[] }) {
  const cart = useCartTotals();
  useCartSync(true);

  const [state, formAction] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const [method, setMethod] = useState<Method>("cod");
  // Controlled: React cannot restore a <select> default after the form resets post-submit.
  const [province, setProvince] = useState("");
  // One id per checkout visit, added when the form is submitted. The server uses it to
  // ignore accidental double submits (React resets form fields after each action, so it
  // cannot live in a hidden input).
  const submissionId = useRef<string | null>(null);

  const methods = useMemo<Method[]>(() => ["cod", ...transferMethods], [transferMethods]);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  useEffect(() => {
    if (cart.count > 0) {
      track("InitiateCheckout", { value: cart.total, currency: "PKR", num_items: cart.count });
    }
    // Fire once per visit to checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cartPayload = JSON.stringify({
    items: cart.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
    giftVariantId: cart.giftEligible ? cart.giftVariantId : null,
    couponCode: cart.coupon?.code ?? null,
  });

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-5 py-24 text-center">
        <p className="font-heading text-3xl">Your bag is empty</p>
        <p className="text-sm text-muted-foreground">Add a piece to your bag to check out.</p>
        <Button href="/shop">Shop now</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
      <form
        id="checkout-form"
        action={(formData) => {
          submissionId.current ??= crypto.randomUUID();
          formData.set("submissionId", submissionId.current);
          formAction(formData);
        }} className="order-2 space-y-10 lg:order-1" noValidate>
        {/* Honeypot */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <input type="hidden" name="cart" value={cartPayload} />
                <input type="hidden" name="paymentMethod" value={method} />

        {state.error && (
          <p role="alert" className="border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        )}

        <fieldset className="space-y-5">
          <legend className="font-heading text-2xl">Contact</legend>
          <Field id="name" label="Full name" error={fe.name}>
            <input id="name" name="name" defaultValue={v.name} autoComplete="name" required aria-invalid={!!fe.name} aria-describedby={fe.name ? "name-error" : undefined} className={inputClass(fe.name)} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="phone" label="Mobile number" error={fe.phone} hint="We confirm your order on this number.">
              <input id="phone" name="phone" defaultValue={v.phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" required aria-invalid={!!fe.phone} aria-describedby={fe.phone ? "phone-error" : "phone-hint"} className={inputClass(fe.phone)} />
            </Field>
            <Field id="email" label="Email (optional)" error={fe.email} hint="For your order confirmation.">
              <input id="email" name="email" defaultValue={v.email} type="email" inputMode="email" autoComplete="email" aria-invalid={!!fe.email} aria-describedby={fe.email ? "email-error" : "email-hint"} className={inputClass(fe.email)} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="font-heading text-2xl">Delivery address</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="province" label="Province" error={fe.province}>
              <select id="province" name="province" autoComplete="address-level1" required value={province} onChange={(e) => setProvince(e.target.value)} aria-invalid={!!fe.province} aria-describedby={fe.province ? "province-error" : undefined} className={inputClass(fe.province)}>
                <option value="" disabled>
                  Select province
                </option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="city" label="City" error={fe.city}>
              <input id="city" name="city" defaultValue={v.city} autoComplete="address-level2" required aria-invalid={!!fe.city} aria-describedby={fe.city ? "city-error" : undefined} className={inputClass(fe.city)} />
            </Field>
          </div>
          <Field id="address" label="Full address" error={fe.address} hint="House number, street, area.">
            <textarea id="address" name="address" defaultValue={v.address} rows={3} autoComplete="street-address" required aria-invalid={!!fe.address} aria-describedby={fe.address ? "address-error" : "address-hint"} className={cn(inputClass(fe.address), "h-auto py-3")} />
          </Field>
          <Field id="landmark" label="Nearby landmark (optional)" error={fe.landmark}>
            <input id="landmark" name="landmark" defaultValue={v.landmark} className={inputClass(fe.landmark)} />
          </Field>
          <Field id="notes" label="Order notes (optional)" error={fe.notes}>
            <input id="notes" name="notes" defaultValue={v.notes} className={inputClass(fe.notes)} />
          </Field>
        </fieldset>

        <fieldset>
          <legend className="font-heading text-2xl">Payment</legend>
          <div className="mt-5 space-y-3">
            {methods.map((m) => {
              const info = METHOD_INFO[m];
              const Icon = info.icon;
              const selected = method === m;
              return (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer items-start gap-4 border bg-surface p-4 transition-[border-color,background-color] duration-200 ease-(--ease-out)",
                    selected ? "border-gold bg-sand/50" : "border-border hover:border-gold",
                  )}
                >
                  <input type="radio" name="payment-choice" value={m} checked={selected} onChange={() => setMethod(m)} className="peer sr-only" />
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
                      selected ? "border-gold" : "border-border",
                    )}
                    aria-hidden="true"
                  >
                    <span className={cn("size-2.5 rounded-full bg-gold transition-transform duration-200", selected ? "scale-100" : "scale-0")} />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="size-4 text-gold-hover" strokeWidth={1.5} />
                      {info.label}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">{info.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {fe.paymentMethod && <p className="mt-2 text-sm text-danger">{fe.paymentMethod}</p>}
          {method !== "cod" && (
            <p className="mt-3 text-sm text-muted-foreground">
              You will see our account details on the next page and can send your transaction ID there.
            </p>
          )}
        </fieldset>

        <div className="space-y-4">
          <SubmitButton total={cart.total} />
          <p className="text-center text-xs text-muted-foreground">
            By placing your order you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4">Terms</Link> and{" "}
            <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.
          </p>
        </div>
      </form>

      {/* Summary */}
      <aside className="order-1 lg:order-2" aria-labelledby="summary-heading">
        <div className="space-y-6 border border-border bg-surface p-5 sm:p-7 lg:sticky lg:top-28">
          <h2 id="summary-heading" className="font-heading text-2xl">
            Order summary
          </h2>
          <ul className="divide-y divide-border">
            {cart.lines.map((l) => (
              <li key={l.variantId} className="flex items-center gap-4 py-4 first:pt-0">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-sand">
                  {l.image && <Image src={l.image} alt="" fill sizes="64px" quality={60} className="object-cover" />}
                  <span className="absolute -right-0 -top-0 grid min-w-5 place-items-center bg-foreground px-1 text-[0.6875rem] text-background">{l.qty}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{l.name}</p>
                  {l.variantName !== "Standard" && <p className="text-xs text-muted-foreground">{l.variantName}</p>}
                </div>
                <p className="text-sm">{formatPKR(l.price * l.qty)}</p>
              </li>
            ))}
            {cart.gift && (
              <li className="flex items-center justify-between gap-3 py-4 text-sm">
                <span className="truncate">{cart.gift.productName}</span>
                <span className="shrink-0 text-gold-hover">Free gift</span>
              </li>
            )}
          </ul>
          <GiftPicker />
          <CouponBox />
          <CartTotals />
          <p className="text-xs text-muted-foreground">
            Final prices and stock are confirmed when you place your order.
          </p>
        </div>
      </aside>
    </div>
  );
}
