import { CheckCircle2, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { EventHistory, OrderLines, OrderProgress, OrderTotalsList, PAYMENT_STATUS_LABEL, StatusBadge } from "@/components/order/order-parts";
import { OrderPlaced, PaymentProofForm } from "@/components/order/order-client";
import { Button } from "@/components/ui/button";
import { getPaymentAccounts, getSettings } from "@/lib/data/site";
import { PAYMENT_LABEL } from "@/lib/email/templates";
import { getOrder } from "@/lib/orders";
import { confirmOrderMessage, piecesIn } from "@/lib/order-text";
import { whatsappLink } from "@/lib/site";
import { formatPKR } from "@/lib/utils";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false, follow: false } };

// Order details are private and tied to the visitor's link, so this page is always rendered fresh.
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!z.uuid().safeParse(token).success) notFound();

  const order = await getOrder({ token });
  if (!order) notFound();

  const [settings, accounts] = await Promise.all([getSettings(), getPaymentAccounts()]);
  const transfer = order.payment_method !== "cod";
  const account = transfer ? accounts.find((a) => a.method === order.payment_method) : undefined;
  const cancelled = order.order_status === "cancelled";

  const waText = confirmOrderMessage(order, PAYMENT_LABEL[order.payment_method]);

  return (
    <div className="wrap py-10 lg:py-16">
      <OrderPlaced eventId={order.meta_event_id} value={order.total} ids={order.items.map((i) => i.name)} />

      <header className="mx-auto max-w-xl text-center">
        <CheckCircle2 className="mx-auto size-12 text-gold" strokeWidth={1.25} />
        <h1 className="text-title mt-5">{cancelled ? "Order cancelled" : "Thank you for your order"}</h1>
        <div className="mx-auto mt-4 h-px w-16 bg-gold" aria-hidden="true" />
        <p className="mt-5 text-muted-foreground">
          Your order number is <strong className="font-medium text-foreground">{order.order_number}</strong>.
          {!cancelled &&
            (transfer
              ? " Complete your payment below and we will confirm your order."
              : " We will confirm it with you on WhatsApp, then dispatch it to your address.")}
        </p>
        <div className="mt-4 flex justify-center">
          <StatusBadge status={order.order_status} />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <Button href="/shop" size="lg">
            Continue shopping
          </Button>
          <Link href="/track" className="link-draw text-base">
            Track another order
          </Link>
        </div>
      </header>

      <div className="mx-auto mt-12 grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="space-y-8">
          {!cancelled && (
            <section className="border border-gold bg-surface p-5 sm:p-7">
              <h2 className="font-heading text-2xl">Confirm on WhatsApp</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Send us your order details in one tap so we can confirm and dispatch it faster.
              </p>
              <Button
                href={whatsappLink(waText, settings.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                size="lg"
                className="mt-5 w-full sm:w-auto"
              >
                <MessageCircle /> Confirm on WhatsApp
              </Button>
            </section>
          )}

          {transfer && !cancelled && (
            <section className="border border-border bg-surface p-5 sm:p-7">
              <h2 className="font-heading text-2xl">Pay by {PAYMENT_LABEL[order.payment_method]}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {PAYMENT_STATUS_LABEL[order.payment_status]}. Amount to send: <strong className="font-medium text-foreground">{formatPKR(order.total)}</strong>
              </p>

              {account ? (
                <dl className="mt-5 space-y-3 bg-sand/60 p-4 text-sm">
                  {account.accountTitle && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Account title</dt>
                      <dd className="text-right">{account.accountTitle}</dd>
                    </div>
                  )}
                  {account.bankName && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Bank</dt>
                      <dd className="text-right">{account.bankName}</dd>
                    </div>
                  )}
                  {account.accountNumber && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Account number</dt>
                      <dd className="select-all text-right font-medium">{account.accountNumber}</dd>
                    </div>
                  )}
                  {account.iban && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">IBAN</dt>
                      <dd className="select-all break-all text-right font-medium">{account.iban}</dd>
                    </div>
                  )}
                  {account.instructions && <p className="border-t border-border pt-3 text-muted-foreground">{account.instructions}</p>}
                </dl>
              ) : (
                <p className="mt-5 bg-sand/60 p-4 text-sm">
                  We will message you the account details on WhatsApp shortly.
                </p>
              )}

              <div className="mt-6">
                {order.hasProof || order.payment_status === "awaiting_verification" || order.payment_status === "paid" ? (
                  <p role="status" className="text-sm">
                    {order.payment_status === "paid"
                      ? "Payment received. Thank you!"
                      : "We have your payment details and will verify them shortly."}
                  </p>
                ) : (
                  <>
                    <h3 className="mb-4 text-sm font-medium">After you pay, send us the details</h3>
                    <PaymentProofForm token={token} />
                  </>
                )}
              </div>
            </section>
          )}

          <section className="border border-border bg-surface p-5 sm:p-7">
            <h2 className="font-heading text-2xl">Delivering to</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {order.customer_name}
              <br />
              {order.address}
              {order.landmark && <><br />Near {order.landmark}</>}
              <br />
              {order.city}, {order.province}
              <br />
              {order.phone}
            </p>
          </section>
        </div>

        <aside className="h-fit space-y-6 border border-border bg-surface p-5 sm:p-7">
          <h2 className="font-heading text-2xl">Order summary</h2>
          <OrderProgress order={order} />
          <OrderLines order={order} />
          <OrderTotalsList order={order} pieces={piecesIn(order.items)} />
          {order.events.length > 1 && (
            <div>
              <h3 className="mb-4 font-heading text-xl">History</h3>
              <EventHistory events={order.events} />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Questions? Call {settings.helpline} or email {settings.email}. Bookmark this page to check your order any time.
          </p>
        </aside>
      </div>
    </div>
  );
}
