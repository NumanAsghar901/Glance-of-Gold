import type { Metadata } from "next";
import { saveGiftOffer } from "@/app/actions/admin-marketing";
import { ActionForm } from "@/components/admin/action-form";
import { Check, Field, Input, PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { toPktInput } from "@/lib/datetime";

export const metadata: Metadata = { title: "Free gift offer" };

type VariantRow = { id: number; name: string; stock: number; product: { name: string } | null };

export default async function GiftsPage() {
  const { supabase } = await requireAdmin();

  const [{ data: offer }, { data: variantsRaw }] = await Promise.all([
    supabase.from("gift_offers").select("*, pool:gift_offer_products(variant_id)").order("id").limit(1).maybeSingle(),
    supabase
      .from("product_variants")
      .select("id, name, stock, product:products(name)")
      .eq("is_active", true)
      .order("product_id")
      .order("sort"),
  ]);

  const variants = (variantsRaw ?? []) as unknown as VariantRow[];
  const selected = new Set((offer?.pool ?? []).map((p: { variant_id: number }) => p.variant_id));

  return (
    <>
      <PageHeader
        title="Free gift offer"
        description="When a customer buys the number of items you choose, they pick one free gift from the list below. The gift is added to their order at no cost."
      />

      <Panel>
        <ActionForm action={saveGiftOffer} submitLabel="Save offer">
          {offer && <input type="hidden" name="id" value={offer.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Offer name" htmlFor="name" hint="Shown on the home page.">
              <Input id="name" name="name" defaultValue={offer?.name ?? "Buy 2, choose 1 free gift"} required />
            </Field>
            <Field label="Items needed in the bag" htmlFor="minItems">
              <Input id="minItems" name="minItems" type="number" min={1} max={20} defaultValue={offer?.min_items ?? 2} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" htmlFor="startsAt" hint="Pakistan time. Empty means now.">
              <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={toPktInput(offer?.starts_at)} />
            </Field>
            <Field label="Ends" htmlFor="endsAt" hint="Pakistan time. Empty means no end date.">
              <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={toPktInput(offer?.ends_at)} />
            </Field>
          </div>
          <Check name="isActive" label="Offer is on" defaultChecked={offer?.is_active ?? false} hint="Customers see the offer on the home page and in their bag." />

          <fieldset>
            <legend className="mb-3 text-sm">Gifts customers can choose from</legend>
            {variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add products first, then choose which ones can be gifts.</p>
            ) : (
              <ul className="grid max-h-96 gap-px overflow-y-auto border border-border bg-border sm:grid-cols-2">
                {variants.map((v) => (
                  <li key={v.id} className="bg-surface">
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-sand/50">
                      <input type="checkbox" name="variantIds" value={v.id} defaultChecked={selected.has(v.id)} className="size-4 shrink-0 accent-[var(--gold)]" />
                      <span className="min-w-0">
                        <span className="block truncate">{v.product?.name ?? "Product"}{v.name !== "Standard" && `, ${v.name}`}</span>
                        <span className="block text-xs text-muted-foreground">{v.stock} in stock</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        </ActionForm>
      </Panel>
    </>
  );
}
