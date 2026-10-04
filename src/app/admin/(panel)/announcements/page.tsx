import type { Metadata } from "next";
import { deleteAnnouncement, saveAnnouncement } from "@/app/actions/admin-marketing";
import { ActionButton, ActionForm } from "@/components/admin/action-form";
import { Check, Field, Input, PageHeader, Panel, Pill } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { toPktInput } from "@/lib/datetime";

export const metadata: Metadata = { title: "Announcement bar" };

type A = {
  id?: number;
  message: string;
  link_url: string | null;
  coupon_code: string | null;
  sort: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

function Fields({ a, p }: { a: A; p: string }) {
  return (
    <>
      {a.id && <input type="hidden" name="id" value={a.id} />}
      <Field label="Message" htmlFor={`${p}-msg`} hint="Keep it short, e.g. Free delivery on orders over Rs. 2,000.">
        <Input id={`${p}-msg`} name="message" defaultValue={a.message} required maxLength={140} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Coupon code to show" htmlFor={`${p}-code`} hint="Optional. Customers can tap it to copy.">
          <Input id={`${p}-code`} name="couponCode" defaultValue={a.coupon_code ?? ""} className="uppercase" />
        </Field>
        <Field label="Link" htmlFor={`${p}-link`} hint="Optional, e.g. /shop">
          <Input id={`${p}-link`} name="linkUrl" defaultValue={a.link_url ?? ""} />
        </Field>
        <Field label="Order" htmlFor={`${p}-sort`} hint="Lower numbers show first.">
          <Input id={`${p}-sort`} name="sort" type="number" min={0} defaultValue={a.sort} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Show from" htmlFor={`${p}-start`} hint="Pakistan time. Empty means now.">
          <Input id={`${p}-start`} name="startsAt" type="datetime-local" defaultValue={toPktInput(a.starts_at)} />
        </Field>
        <Field label="Show until" htmlFor={`${p}-end`} hint="Pakistan time. Empty means no end date.">
          <Input id={`${p}-end`} name="endsAt" type="datetime-local" defaultValue={toPktInput(a.ends_at)} />
        </Field>
      </div>
      <Check name="isActive" label="Showing" defaultChecked={a.is_active} />
    </>
  );
}

export default async function AnnouncementsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("announcements").select("*").order("sort").order("id");

  return (
    <>
      <PageHeader title="Announcement bar" description="The thin strip at the top of every page. Several messages rotate automatically." />

      <Panel title="Add a message" className="mb-8">
        <ActionForm action={saveAnnouncement} submitLabel="Add message">
          <Fields p="new" a={{ message: "", link_url: null, coupon_code: null, sort: (data?.length ?? 0) + 1, is_active: true, starts_at: null, ends_at: null }} />
        </ActionForm>
      </Panel>

      <ul className="space-y-4">
        {data?.map((a) => (
          <li key={a.id}>
            <details className="group border border-border bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 text-sm">
                  {a.message}
                  {a.coupon_code && <span className="ml-2 border border-gold px-2 py-0.5 text-xs tracking-[0.12em]">{a.coupon_code}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {a.is_active ? <Pill tone="good">Showing</Pill> : <Pill>Off</Pill>}
                  <span className="text-sm text-muted-foreground group-open:hidden">Edit</span>
                </span>
              </summary>
              <div className="space-y-6 border-t border-border p-5">
                <ActionForm action={saveAnnouncement}>
                  <Fields p={`a${a.id}`} a={a} />
                </ActionForm>
                <div className="border-t border-border pt-5">
                  <ActionButton action={deleteAnnouncement} fields={{ id: a.id }} confirm="Delete this message?">
                    Delete message
                  </ActionButton>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
