import { Check } from "lucide-react";
import type { OrderView } from "@/lib/orders";
import { PAYMENT_LABEL } from "@/lib/email/templates";
import { cn, formatPKR } from "@/lib/utils";

export const STATUS_LABEL: Record<OrderView["order_status"], string> = {
  pending: "Order received",
  confirmed: "Confirmed",
  processing: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const PAYMENT_STATUS_LABEL: Record<OrderView["payment_status"], string> = {
  unpaid: "Payment due",
  awaiting_verification: "Payment being verified",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

const STEPS: OrderView["order_status"][] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export function StatusBadge({ status }: { status: OrderView["order_status"] }) {
  const bad = status === "cancelled" || status === "returned";
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 text-[0.6875rem] uppercase tracking-[0.14em]",
        bad ? "bg-danger/10 text-danger" : "bg-blush text-foreground",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Horizontal progress for normal orders; cancelled/returned orders show their history instead. */
export function OrderProgress({ order }: { order: Pick<OrderView, "order_status"> }) {
  if (order.order_status === "cancelled" || order.order_status === "returned") {
    return (
      <p className="text-sm text-muted-foreground">
        This order was {order.order_status}. Contact us if you have any questions.
      </p>
    );
  }
  const current = STEPS.indexOf(order.order_status);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s} className="flex flex-col items-center gap-2 text-center" aria-current={i === current ? "step" : undefined}>
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full border text-xs transition-colors",
                done ? "border-gold bg-gold text-foreground" : "border-border text-muted-foreground",
              )}
            >
              {done && i < current ? <Check className="size-3.5" strokeWidth={2} /> : i + 1}
            </span>
            <span className={cn("text-[0.6875rem] leading-tight", done ? "text-foreground" : "text-muted-foreground")}>
              {STATUS_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderLines({ order }: { order: Pick<OrderView, "items"> }) {
  return (
    <ul className="divide-y divide-border">
      {order.items.map((i, idx) => (
        <li key={idx} className="flex items-center gap-4 py-4 first:pt-0">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{i.name}</p>
            <p className="text-xs text-muted-foreground">
              {i.variant_name && i.variant_name !== "Standard" ? `${i.variant_name} · ` : ""}Qty {i.qty}
              {i.is_gift && <span className="text-gold-hover"> · Free gift</span>}
            </p>
          </div>
          <p className="text-sm">{i.is_gift ? "Free" : formatPKR(i.unit_price * i.qty)}</p>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotalsList({
  order,
}: {
  order: Pick<OrderView, "subtotal" | "discount" | "coupon_code" | "shipping_fee" | "total" | "payment_method">;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd>{formatPKR(order.subtotal)}</dd>
      </div>
      {order.discount > 0 && (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt>
          <dd>-{formatPKR(order.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Delivery</dt>
        <dd>{order.shipping_fee === 0 ? "Free" : formatPKR(order.shipping_fee)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
        <dt>Total</dt>
        <dd>{formatPKR(order.total)}</dd>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <dt>Payment</dt>
        <dd>{PAYMENT_LABEL[order.payment_method]}</dd>
      </div>
    </dl>
  );
}

export function EventHistory({ events }: { events: OrderView["events"] }) {
  if (events.length === 0) return null;
  return (
    <ol className="space-y-3 border-l border-border pl-5">
      {events.map((e, i) => (
        <li key={i} className="relative text-sm">
          <span className="absolute -left-[1.6rem] top-1.5 size-2 rounded-full bg-gold" aria-hidden="true" />
          <p>{STATUS_LABEL[e.status as OrderView["order_status"]] ?? e.status}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(e.created_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
            {e.note && e.note !== "Order placed" ? ` · ${e.note}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
