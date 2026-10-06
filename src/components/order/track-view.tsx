"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { trackOrder, type TrackState } from "@/app/actions/order";
import {
  EventHistory,
  OrderLines,
  OrderProgress,
  OrderTotalsList,
  PAYMENT_STATUS_LABEL,
  StatusBadge,
} from "@/components/order/order-parts";
import { Button } from "@/components/ui/button";
import { piecesIn } from "@/lib/order-text";

const inputClass =
  "h-12 w-full border border-border bg-surface px-4 text-base transition-colors duration-200 placeholder:text-muted-foreground hover:border-gold focus-visible:border-gold sm:text-sm";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? "Looking up..." : "Track order"}
    </Button>
  );
}

export function TrackView() {
  const [state, action] = useActionState<TrackState, FormData>(trackOrder, {});
  const order = state.order;

  return (
    <div className="space-y-12">
      <form action={action} className="mx-auto max-w-md space-y-5" noValidate>
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        {state.error && (
          <p role="alert" className="border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        )}
        <div>
          <label htmlFor="orderNumber" className="mb-2 block text-sm">
            Order number
          </label>
          <input id="orderNumber" name="orderNumber" placeholder="GG-10001" autoComplete="off" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm">
            Mobile number used for the order
          </label>
          <input id="phone" name="phone" type="tel" inputMode="tel" placeholder="0300 1234567" autoComplete="tel" required className={inputClass} />
        </div>
        <Submit />
      </form>

      {order && (
        <section aria-label="Order status" className="mx-auto max-w-2xl space-y-8 border border-border bg-surface p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Order</p>
              <p className="font-heading text-3xl">{order.order_number}</p>
            </div>
            <StatusBadge status={order.order_status} />
          </div>

          <OrderProgress order={order} />

          {order.tracking_number && (
            <p className="bg-sand px-4 py-3 text-sm">
              {order.courier ?? "Courier"} tracking number: <strong className="font-medium">{order.tracking_number}</strong>
            </p>
          )}
          {order.payment_method !== "cod" && (
            <p className="text-sm text-muted-foreground">{PAYMENT_STATUS_LABEL[order.payment_status]}</p>
          )}

          <OrderLines order={order} />
          <OrderTotalsList order={order} pieces={piecesIn(order.items)} />

          <div>
            <h2 className="mb-4 font-heading text-xl">History</h2>
            <EventHistory events={order.events} />
          </div>
        </section>
      )}
    </div>
  );
}
