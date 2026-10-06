import type { Metadata } from "next";
import Link from "next/link";
import { Empty, orderTone, PageHeader, Panel, Pill } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { currentTime, formatPKR } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const DAY = 24 * 60 * 60 * 1000;

export default async function AdminDashboard() {
  const { supabase, name } = await requireAdmin();
  const nowMs = currentTime();
  const since30 = new Date(nowMs - 30 * DAY).toISOString();

  const [pending, verifying, recentRows, lowStock, samples, accounts, recent] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "awaiting_verification")
      .neq("order_status", "cancelled"),
    supabase.from("orders").select("total, created_at, order_status").gte("created_at", since30).limit(2000),
    supabase
      .from("product_variants")
      .select("id, name, stock, product:products(id, name)")
      .eq("is_active", true)
      .lte("stock", 3)
      .order("stock")
      .limit(8),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_sample", true),
    supabase.from("payment_accounts").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, total, order_status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const live = (recentRows.data ?? []).filter((o) => o.order_status !== "cancelled" && o.order_status !== "returned");
  const week = nowMs - 7 * DAY;
  const today = nowMs - DAY;
  const sum = (rows: typeof live) => rows.reduce((n, o) => n + o.total, 0);

  const stats = [
    { label: "Orders today", value: String(live.filter((o) => new Date(o.created_at).getTime() >= today).length) },
    { label: "Awaiting confirmation", value: String(pending.count ?? 0), href: "/admin/orders?status=pending" },
    { label: "Payments to verify", value: String(verifying.count ?? 0), href: "/admin/orders" },
    { label: "Sales, last 7 days", value: formatPKR(sum(live.filter((o) => new Date(o.created_at).getTime() >= week))) },
    { label: "Sales, last 30 days", value: formatPKR(sum(live)) },
  ];

  const todo: { text: string; href: string; cta: string }[] = [];
  if ((accounts.count ?? 0) === 0) {
    todo.push({
      text: "Only cash on delivery is offered. Add your JazzCash, Easypaisa or bank details to accept transfers.",
      href: "/admin/payments",
      cta: "Add payment accounts",
    });
  }
  if ((samples.count ?? 0) > 0) {
    todo.push({
      text: `${samples.count} sample products are still in the store. Add your real products, then remove the samples.`,
      href: "/admin/products",
      cta: "Manage products",
    });
  }

  return (
    <>
      <PageHeader title={`Welcome${name ? `, ${name.split(" ")[0]}` : ""}`} description="What needs your attention today." />

      {/* An odd last tile spans both columns on phones so no empty filled cell is left behind. */}
      <dl className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-5 [&>:last-child:nth-child(odd)]:col-span-2 lg:[&>:last-child:nth-child(odd)]:col-span-1">
        {stats.map((s) => {
          const body = (
            <>
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="mt-2 font-heading text-3xl">{s.value}</dd>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="bg-surface p-5 transition-colors duration-200 hover:bg-sand/50">
              {body}
            </Link>
          ) : (
            <div key={s.label} className="bg-surface p-5">
              {body}
            </div>
          );
        })}
      </dl>

      {todo.length > 0 && (
        <Panel title="Set up" className="mt-6">
          <ul className="divide-y divide-border">
            {todo.map((t) => (
              <li key={t.href} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <p className="max-w-xl text-sm">{t.text}</p>
                <Link prefetch={false} href={t.href} className="link-draw text-sm">
                  {t.cta}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Recent orders" actions={<Link prefetch={false} href="/admin/orders" className="link-draw text-sm">View all</Link>}>
          {recent.data?.length ? (
            <ul className="divide-y divide-border">
              {recent.data.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 max-w-full">
                    <Link prefetch={false} href={`/admin/orders/${o.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                      {o.order_number}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.customer_name}, {new Date(o.created_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="whitespace-nowrap text-sm">{formatPKR(o.total)}</span>
                    <Pill tone={orderTone(o.order_status)}>{o.order_status}</Pill>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No orders yet.</Empty>
          )}
        </Panel>

        <Panel title="Low stock">
          {lowStock.data?.length ? (
            <ul className="divide-y divide-border">
              {lowStock.data.map((v) => {
                const p = v.product as unknown as { id: number; name: string } | null;
                return (
                  <li key={v.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 text-sm">
                    <Link prefetch={false} href={p ? `/admin/products/${p.id}` : "/admin/products"} className="min-w-0 truncate underline-offset-4 hover:underline">
                      {p?.name ?? "Product"}
                      {v.name !== "Standard" && <span className="text-muted-foreground">, {v.name}</span>}
                    </Link>
                    <Pill tone={v.stock === 0 ? "bad" : "warn"}>{v.stock === 0 ? "Sold out" : `${v.stock} left`}</Pill>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Everything is well stocked.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
