import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteAbandonedCheckout, setCheckoutContacted } from "@/app/actions/admin-abandoned";
import { ActionButton } from "@/components/admin/action-form";
import { Empty, PageHeader, Pager, Panel, Pill, TableWrap, td, th } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { LinkPending } from "@/components/ui/link-pending";
import { requireAdmin } from "@/lib/admin/auth";
import { whatsappLink } from "@/lib/site";
import { cn, currentTime, formatPKR } from "@/lib/utils";

export const metadata: Metadata = { title: "Abandoned checkouts" };

const TABS = [
  { key: "open", label: "Needs follow-up" },
  { key: "contacted", label: "Contacted" },
  { key: "recovered", label: "Order placed" },
  { key: "all", label: "All" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const PAGE_SIZE = 25;
/** A checkout touched in the last half hour may still be in progress, so it is flagged rather than chased. */
const STILL_TYPING_MS = 30 * 60_000;

type Item = { name: string; variantName: string; qty: number; price: number };

/** The saved bag is stored as JSON; read it defensively. */
function readItems(value: unknown): Item[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const o = v as Record<string, unknown>;
    return typeof o.name === "string" && typeof o.qty === "number" && typeof o.price === "number"
      ? [{ name: o.name, variantName: typeof o.variantName === "string" ? o.variantName : "", qty: o.qty, price: o.price }]
      : [];
  });
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" });

export default async function AbandonedCheckoutsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const tab: Tab = TABS.find((t) => t.key === sp.tab)?.key ?? "open";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  let query = supabase
    .from("abandoned_checkouts")
    .select("id, phone, customer_name, email, province, city, address, landmark, items, subtotal, status, contacted_at, order_id, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (tab !== "all") query = query.eq("status", tab);

  const [{ data, error, count }, open, contacted] = await Promise.all([
    query,
    supabase.from("abandoned_checkouts").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("abandoned_checkouts").select("id", { count: "exact", head: true }).eq("status", "contacted"),
  ]);

  // PGRST103 only means the page number is past the last page; anything else is the missing table.
  if (error && error.code !== "PGRST103") {
    return (
      <>
        <PageHeader title="Abandoned checkouts" />
        <Panel title="One-time database step needed">
          <p className="max-w-2xl text-sm leading-relaxed">
            Abandoned checkouts need a small database update. In Supabase, open <strong className="font-medium">SQL Editor, New query</strong>, paste the whole contents of{" "}
            <code className="bg-sand px-1.5 py-0.5 text-xs">supabase/migrations/20261026000001_abandoned_checkouts.sql</code> from the project folder, and click{" "}
            <strong className="font-medium">Run</strong>. Then reload this page.
          </p>
        </Panel>
      </>
    );
  }

  const now = currentTime();
  const rows = data ?? [];
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const counts: Record<Tab, number | null> = { open: open.count ?? 0, contacted: contacted.count ?? 0, recovered: null, all: null };
  const href = (over: { tab?: Tab; page?: number }) => {
    const t = over.tab ?? tab;
    const p = new URLSearchParams();
    if (t !== "open") p.set("tab", t);
    if (over.page && over.page > 1) p.set("page", String(over.page));
    const s = p.toString();
    return s ? `/admin/abandoned?${s}` : "/admin/abandoned";
  };

  return (
    <>
      <PageHeader
        title="Abandoned checkouts"
        description="People who entered their details at checkout but did not place an order. Contact them on WhatsApp or by phone to help finish the order."
      />

      <nav aria-label="Abandoned checkout status" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            prefetch={false}
            href={href({ tab: t.key })}
            aria-current={t.key === tab ? "true" : undefined}
            className={cn(
              "relative inline-flex min-h-11 items-center gap-2 border px-3.5 text-sm transition-colors duration-200",
              t.key === tab ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:border-gold",
            )}
          >
            {t.label}
            {counts[t.key] !== null && <span className="text-xs opacity-75">{counts[t.key]}</span>}
            <LinkPending />
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <Empty>
          {tab === "open"
            ? "Nothing to follow up. When someone enters their phone number at checkout and leaves without ordering, they appear here."
            : "Nothing here yet."}
        </Empty>
      ) : (
        <TableWrap>
          <table className="stack-table w-full border-collapse md:min-w-[44rem]">
            <thead>
              <tr>
                <th className={th}>Customer</th>
                <th className={th}>Bag</th>
                <th className={th}>Total</th>
                <th className={th}>Last activity</th>
                <th className={th}>Status</th>
                <th className={th}>Follow up</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const items = readItems(r.items);
                const stillTyping = r.status === "open" && now - new Date(r.updated_at).getTime() < STILL_TYPING_MS;
                const greeting = `Hello${r.customer_name ? ` ${r.customer_name}` : ""}, this is Little Luxe Glow. We saw you were checking out on our website and wanted to help you finish your order. Is there anything we can help with?`;
                return (
                  <tr key={r.id} className="transition-colors hover:bg-sand/40">
                    <td className={td} data-label="Customer">
                      <span className="font-medium">{r.customer_name || "No name yet"}</span>
                      <a href={`tel:+92${r.phone.slice(1)}`} className="block underline-offset-4 hover:underline">
                        {r.phone}
                      </a>
                      <span className="block text-xs text-muted-foreground">
                        {[r.address, r.landmark && `near ${r.landmark}`, r.city, r.province].filter(Boolean).join(", ") || "No address yet"}
                      </span>
                      {r.email && <span className="block text-xs text-muted-foreground">{r.email}</span>}
                    </td>
                    <td className={td} data-label="Bag">
                      {items.length === 0 ? (
                        <span className="text-muted-foreground">Empty</span>
                      ) : (
                        <ul className="space-y-1">
                          {items.map((i, n) => (
                            <li key={n}>
                              {i.name}
                              {i.variantName && i.variantName !== "Standard" && <span className="text-xs text-muted-foreground">, {i.variantName}</span>}
                              <span className="block text-xs text-muted-foreground">
                                Qty {i.qty}, {formatPKR(i.price)} each
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className={cn(td, "md:whitespace-nowrap")} data-label="Total">
                      {formatPKR(r.subtotal)}
                    </td>
                    <td className={cn(td, "text-muted-foreground md:whitespace-nowrap")} data-label="Last activity">
                      {when(r.updated_at)}
                    </td>
                    <td className={td} data-label="Status">
                      {r.status === "recovered" ? (
                        <Pill tone="good">Order placed</Pill>
                      ) : r.status === "contacted" ? (
                        <Pill>Contacted{r.contacted_at ? `, ${when(r.contacted_at)}` : ""}</Pill>
                      ) : stillTyping ? (
                        <Pill>Still at checkout</Pill>
                      ) : (
                        <Pill tone="warn">Needs follow-up</Pill>
                      )}
                      {r.status === "recovered" && r.order_id && (
                        <Link prefetch={false} href={`/admin/orders/${r.order_id}`} className="link-draw mt-1 block text-xs">
                          View the order
                        </Link>
                      )}
                    </td>
                    <td className={td} data-label="Follow up">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.status !== "recovered" && (
                          <a
                            href={whatsappLink(greeting, r.phone.replace(/^0/, "92"))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            <MessageCircle strokeWidth={1.5} /> WhatsApp
                          </a>
                        )}
                        {r.status === "open" && (
                          <ActionButton action={setCheckoutContacted} fields={{ id: r.id, contacted: 1 }}>
                            Mark contacted
                          </ActionButton>
                        )}
                        {r.status === "contacted" && (
                          <ActionButton action={setCheckoutContacted} fields={{ id: r.id, contacted: 0 }}>
                            Not contacted
                          </ActionButton>
                        )}
                        <ActionButton action={deleteAbandonedCheckout} fields={{ id: r.id }} confirm="Delete this saved checkout? This cannot be undone.">
                          Delete
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      <Pager page={page} pageCount={pageCount} hrefFor={(n) => href({ page: n })} />
    </>
  );
}
