import type { Metadata } from "next";
import Link from "next/link";
import { Empty, Input, orderTone, PageHeader, Pager, Pill, TableWrap, td, th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { LinkPending } from "@/components/ui/link-pending";
import { requireAdmin } from "@/lib/admin/auth";
import { PAYMENT_LABEL } from "@/lib/email/templates";
import { cn, formatPKR } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"] as const;
const PAGE_SIZE = 25;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  // Keep only characters that are safe inside a PostgREST or() filter.
  const q = (sp.q ?? "").replace(/[^a-zA-Z0-9\s-]/g, "").trim().slice(0, 40);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  let query = supabase
    .from("orders")
    .select("id, order_number, customer_name, phone, city, total, payment_method, payment_status, order_status, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("order_status", status);
  if (q) query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data: orders, count } = await query;
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, q: q || undefined, page: undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <>
      <PageHeader title="Orders" description={`${count ?? 0} ${count === 1 ? "order" : "orders"}${status ? ` with status ${status}` : ""}.`} />

      <form action="/admin/orders" className="mb-4 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="q" className="sr-only">
          Search orders
        </label>
        <Input id="q" name="q" defaultValue={q} placeholder="Search by order number, name or phone" className="max-w-md" />
        <Button type="submit" variant="outline" size="md">
          Search
        </Button>
      </form>

      <nav aria-label="Order status" className="mb-6 flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={href({ status: s })}
            aria-current={s === status ? "true" : undefined}
            className={cn(
              "relative inline-flex min-h-11 items-center border px-3.5 text-sm capitalize transition-colors duration-200",
              s === status ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:border-gold",
            )}
          >
            {s ?? "All"}
            <LinkPending />
          </Link>
        ))}
      </nav>

      {!orders?.length ? (
        <Empty>No orders match. New orders appear here as soon as customers place them.</Empty>
      ) : (
        <TableWrap>
          <table className="stack-table w-full border-collapse md:min-w-[40rem]">
            <thead>
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Customer</th>
                <th className={th}>Total</th>
                <th className={th}>Payment</th>
                <th className={th}>Status</th>
                <th className={th}>Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-sand/40">
                  <td className={td}>
                    <Link prefetch={false} href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className={td} data-label="Customer">
                    {o.customer_name}
                    <span className="block text-xs text-muted-foreground">
                      {o.phone}, {o.city}
                    </span>
                  </td>
                  <td className={td} data-label="Total">{formatPKR(o.total)}</td>
                  <td className={td} data-label="Payment">
                    {PAYMENT_LABEL[o.payment_method]}
                    <span className="mt-1 block">
                      <Pill tone={o.payment_status === "paid" ? "good" : o.payment_status === "awaiting_verification" ? "warn" : "neutral"}>
                        {o.payment_status.replace("_", " ")}
                      </Pill>
                    </span>
                  </td>
                  <td className={td} data-label="Status">
                    <Pill tone={orderTone(o.order_status)}>{o.order_status}</Pill>
                  </td>
                  <td className={cn(td, "text-muted-foreground md:whitespace-nowrap")} data-label="Placed">
                    {new Date(o.created_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <Pager page={page} pageCount={pageCount} hrefFor={(n) => href({ page: String(n) })} />
    </>
  );
}
