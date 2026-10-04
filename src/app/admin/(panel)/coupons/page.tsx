import type { Metadata } from "next";
import { deleteCoupon, saveCoupon } from "@/app/actions/admin-marketing";
import { ActionButton, ActionForm } from "@/components/admin/action-form";
import { Check, Field, Input, PageHeader, Panel, Pill, Select } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { toPktInput } from "@/lib/datetime";
import { currentTime, formatPKR } from "@/lib/utils";

export const metadata: Metadata = { title: "Coupons" };

type Coupon = {
  id?: number;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count?: number;
  once_per_phone: boolean;
  free_shipping: boolean;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

const blank: Coupon = {
  code: "",
  description: "",
  discount_type: "percent",
  value: 10,
  min_subtotal: 0,
  max_discount: null,
  usage_limit: null,
  once_per_phone: true,
  free_shipping: false,
  starts_at: null,
  expires_at: null,
  is_active: true,
};

function Fields({ c, p }: { c: Coupon; p: string }) {
  return (
    <>
      {c.id && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Coupon code" htmlFor={`${p}-code`} hint="Customers type this at checkout. Letters and numbers only, e.g. WELCOME10.">
          <Input id={`${p}-code`} name="code" defaultValue={c.code} required className="uppercase" autoCapitalize="characters" />
        </Field>
        <Field label="Note for yourself" htmlFor={`${p}-desc`}>
          <Input id={`${p}-desc`} name="description" defaultValue={c.description ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Discount type" htmlFor={`${p}-type`}>
          <Select id={`${p}-type`} name="discountType" defaultValue={c.discount_type}>
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off (Rs.)</option>
          </Select>
        </Field>
        <Field label="Discount" htmlFor={`${p}-value`} hint="Percent or rupees, matching the type.">
          <Input id={`${p}-value`} name="value" type="number" min={0} defaultValue={c.value} />
        </Field>
        <Field label="Largest discount (Rs.)" htmlFor={`${p}-max`} hint="Optional cap for percentage coupons.">
          <Input id={`${p}-max`} name="maxDiscount" type="number" min={0} defaultValue={c.max_discount ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Minimum order (Rs.)" htmlFor={`${p}-min`}>
          <Input id={`${p}-min`} name="minSubtotal" type="number" min={0} defaultValue={c.min_subtotal} />
        </Field>
        <Field label="Total uses allowed" htmlFor={`${p}-limit`} hint="Empty means unlimited.">
          <Input id={`${p}-limit`} name="usageLimit" type="number" min={0} defaultValue={c.usage_limit ?? ""} />
        </Field>
        <div />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" htmlFor={`${p}-start`} hint="Pakistan time. Empty means now.">
          <Input id={`${p}-start`} name="startsAt" type="datetime-local" defaultValue={toPktInput(c.starts_at)} />
        </Field>
        <Field label="Expires" htmlFor={`${p}-end`} hint="Pakistan time. Empty means never.">
          <Input id={`${p}-end`} name="expiresAt" type="datetime-local" defaultValue={toPktInput(c.expires_at)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Check name="freeShipping" label="Free delivery" defaultChecked={c.free_shipping} />
        <Check name="oncePerPhone" label="One use per phone number" defaultChecked={c.once_per_phone} />
        <Check name="isActive" label="Active" defaultChecked={c.is_active} />
      </div>
    </>
  );
}

function summary(c: Coupon) {
  const parts: string[] = [];
  if (c.value > 0) parts.push(c.discount_type === "percent" ? `${c.value}% off` : `${formatPKR(c.value)} off`);
  if (c.free_shipping) parts.push("free delivery");
  if (c.min_subtotal > 0) parts.push(`over ${formatPKR(c.min_subtotal)}`);
  return parts.join(", ");
}

export default async function CouponsPage() {
  const { supabase } = await requireAdmin();
  const { data: coupons } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Coupons" description="Create discount codes. Customers enter them in their bag or at checkout." />

      <Panel title="Create a coupon" className="mb-8">
        <ActionForm action={saveCoupon} submitLabel="Create coupon">
          <Fields c={blank} p="new" />
        </ActionForm>
      </Panel>

      {coupons?.length ? (
        <ul className="space-y-4">
          {coupons.map((c) => {
            const now = currentTime();
            const expired = c.expires_at && Date.parse(c.expires_at) <= now;
            const exhausted = c.usage_limit !== null && c.used_count >= c.usage_limit;
            return (
              <li key={c.id}>
                <details className="group border border-border bg-surface">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="block font-medium tracking-[0.12em]">{c.code}</span>
                      <span className="block text-xs text-muted-foreground">
                        {summary(c)}. Used {c.used_count}
                        {c.usage_limit !== null ? ` of ${c.usage_limit}` : ""} times.
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {expired ? <Pill tone="bad">Expired</Pill> : exhausted ? <Pill tone="bad">Used up</Pill> : c.is_active ? <Pill tone="good">Active</Pill> : <Pill>Off</Pill>}
                      <span className="text-sm text-muted-foreground group-open:hidden">Edit</span>
                    </span>
                  </summary>
                  <div className="space-y-6 border-t border-border p-5">
                    <ActionForm action={saveCoupon}>
                      <Fields c={c} p={`c${c.id}`} />
                    </ActionForm>
                    <div className="border-t border-border pt-5">
                      <ActionButton action={deleteCoupon} fields={{ id: c.id }} confirm={`Delete ${c.code}? If it has been used it will be switched off instead.`}>
                        Delete coupon
                      </ActionButton>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">No coupons yet. Create one above.</p>
      )}
    </>
  );
}
