import { ArrowLeft, Check, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  resendOrderEmails,
  setPaymentStatus,
  toggleWhatsappConfirmed,
  updateOrder,
} from "@/app/actions/admin-orders";
import { ActionButton, ActionForm } from "@/components/admin/action-form";
import { Field, Input, orderTone, paymentTone, Panel, Pill, Select } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { PAYMENT_LABEL } from "@/lib/email/templates";
import { whatsappLink } from "@/lib/site";
import { formatPKR } from "@/lib/utils";

export const metadata: Metadata = { title: "Order" };

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"] as const;

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const parsedId = z.coerce.number().int().positive().safeParse((await params).id);
  if (!parsedId.success) notFound();
  const id = parsedId.data;

  const [{ data: order }, { data: items }, { data: events }, { data: proofs }, { data: emails }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", id).order("id"),
    supabase.from("order_events").select("*").eq("order_id", id).order("created_at"),
    supabase.from("payment_proofs").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    supabase.from("email_log").select("*").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!order) notFound();

  // Payment screenshots live in a private bucket; hand out short-lived links.
  const proofsWithUrls = await Promise.all(
    (proofs ?? []).map(async (p) => {
      if (!p.screenshot_path) return { ...p, url: null as string | null };
      const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(p.screenshot_path, 600);
      return { ...p, url: data?.signedUrl ?? null };
    }),
  );

  const customerWa = whatsappLink(
    `Hello ${order.customer_name}, this is Glance of Gold regarding your order ${order.order_number}.`,
    order.phone.replace(/^0/, "92"),
  );
  const cancelled = order.order_status === "cancelled";

  return (
    <>
      <Link prefetch={false} href="/admin/orders" className="link-draw mb-6 inline-flex items-center gap-2 text-sm">
        <ArrowLeft className="size-4" strokeWidth={1.5} /> All orders
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl">{order.order_number}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Placed {new Date(order.created_at).toLocaleString("en-PK", { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={orderTone(order.order_status)}>{order.order_status}</Pill>
          <Pill tone={paymentTone(order.payment_status)}>{order.payment_status.replace("_", " ")}</Pill>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title="Items">
            <ul className="divide-y divide-border">
              {items?.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.variant_name && i.variant_name !== "Standard" ? `${i.variant_name}, ` : ""}Qty {i.qty}
                      {i.is_gift ? ", free gift" : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm">{i.is_gift ? "Free" : formatPKR(i.unit_price * i.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPKR(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Discount {order.coupon_code && `(${order.coupon_code})`}</dt><dd>-{formatPKR(order.discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{order.shipping_fee === 0 ? "Free" : formatPKR(order.shipping_fee)}</dd></div>
              <div className="flex justify-between pt-1 text-base font-medium"><dt>Total</dt><dd>{formatPKR(order.total)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Customer and delivery">
            <p className="text-sm leading-relaxed">
              {order.customer_name}
              <br />
              {order.address}
              {order.landmark && <><br />Near {order.landmark}</>}
              <br />
              {order.city}, {order.province}
            </p>
            <p className="mt-3 text-sm">
              <a href={`tel:+92${order.phone.slice(1)}`} className="underline underline-offset-4">{order.phone}</a>
              {order.email && <> and <a href={`mailto:${order.email}`} className="underline underline-offset-4">{order.email}</a></>}
            </p>
            {order.notes && <p className="mt-3 bg-sand/60 p-3 text-sm">Customer note: {order.notes}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href={customerWa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 border border-gold px-4 text-sm transition-colors duration-200 hover:bg-gold"
              >
                <MessageCircle className="size-4" strokeWidth={1.5} /> Message on WhatsApp
              </a>
              <ActionButton action={toggleWhatsappConfirmed} fields={{ id, confirmed: order.whatsapp_confirmed_at ? 1 : 0 }}>
                {order.whatsapp_confirmed_at ? (
                  <><Check className="size-4" /> Confirmed on WhatsApp (undo)</>
                ) : (
                  "Mark confirmed on WhatsApp"
                )}
              </ActionButton>
            </div>
          </Panel>

          <Panel title="History">
            <ol className="space-y-3 border-l border-border pl-5">
              {events?.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[1.6rem] top-1.5 size-2 rounded-full bg-gold" aria-hidden="true" />
                  <p className="capitalize">{e.status}{e.note ? `: ${e.note}` : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Update order">
            <ActionForm action={updateOrder} submitLabel="Save order">
              <input type="hidden" name="id" value={id} />
              <Field label="Status" htmlFor="orderStatus">
                <Select id="orderStatus" name="orderStatus" defaultValue={order.order_status} disabled={cancelled}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <Field label="Courier" htmlFor="courier">
                  <Input id="courier" name="courier" defaultValue={order.courier ?? ""} />
                </Field>
                <Field label="Tracking number" htmlFor="trackingNumber">
                  <Input id="trackingNumber" name="trackingNumber" defaultValue={order.tracking_number ?? ""} />
                </Field>
              </div>
              <Field label="Cancellation reason" htmlFor="cancelReason" hint="Only used when the status is Cancelled. Cancelling returns the stock and cannot be undone.">
                <Input id="cancelReason" name="cancelReason" defaultValue={order.cancel_reason ?? ""} />
              </Field>
            </ActionForm>
          </Panel>

          <Panel title="Payment">
            <p className="text-sm">
              {PAYMENT_LABEL[order.payment_method]}, {formatPKR(order.total)}
            </p>
            {order.payment_method !== "cod" && (
              <div className="mt-4 space-y-4">
                {proofsWithUrls.length === 0 ? (
                  <p className="text-sm text-muted-foreground">The customer has not sent payment details yet.</p>
                ) : (
                  proofsWithUrls.map((p) => (
                    <div key={p.id} className="border border-border p-3 text-sm">
                      <p>Transaction ID: <strong className="font-medium">{p.transaction_id}</strong></p>
                      <p className="text-xs text-muted-foreground">
                        Sent {new Date(p.created_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                        {p.verified_at && ", verified"}
                      </p>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block underline underline-offset-4">
                          View screenshot
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {order.payment_status !== "paid" && (
                <ActionButton action={setPaymentStatus} fields={{ id, status: "paid" }} variant="primary">
                  Mark as paid
                </ActionButton>
              )}
              {order.payment_status !== "failed" && order.payment_method !== "cod" && (
                <ActionButton action={setPaymentStatus} fields={{ id, status: "failed" }} confirm="Mark this payment as failed?">
                  Payment failed
                </ActionButton>
              )}
              {order.payment_status === "paid" && (
                <ActionButton action={setPaymentStatus} fields={{ id, status: "refunded" }} confirm="Mark this order as refunded?">
                  Mark refunded
                </ActionButton>
              )}
            </div>
          </Panel>

          <Panel title="Emails">
            {emails?.length ? (
              <ul className="space-y-2 text-sm">
                {emails.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3">
                    <span>
                      {e.kind.replace(/_/g, " ")}
                      <span className="block text-xs text-muted-foreground">{e.to_email}</span>
                      {e.error && <span className="block text-xs text-danger">{e.error}</span>}
                    </span>
                    <Pill tone={e.status === "sent" ? "good" : e.status === "failed" ? "bad" : "neutral"}>{e.status}</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No emails recorded for this order.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {order.email && (
                <ActionButton action={resendOrderEmails} fields={{ id, only: "customer" }}>
                  Resend to customer
                </ActionButton>
              )}
              <ActionButton action={resendOrderEmails} fields={{ id, only: "owner" }}>
                Resend to me
              </ActionButton>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
