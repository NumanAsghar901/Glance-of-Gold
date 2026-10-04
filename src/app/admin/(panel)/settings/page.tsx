import type { Metadata } from "next";
import { saveSettings } from "@/app/actions/admin-store";
import { ActionForm } from "@/components/admin/action-form";
import { Field, Input, PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  const num = (k: string, d: number) => (typeof map.get(k) === "number" ? (map.get(k) as number) : d);
  const str = (k: string, d: string) => (typeof map.get(k) === "string" ? (map.get(k) as string) : d);

  return (
    <>
      <PageHeader title="Settings" description="Delivery charges and the contact details shown across the store." />
      <Panel>
        <ActionForm action={saveSettings} submitLabel="Save settings">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Delivery charge (Rs.)" htmlFor="shippingFlat" hint="Charged on every order under the free delivery amount.">
              <Input id="shippingFlat" name="shippingFlat" type="number" min={0} defaultValue={num("shipping_flat", 100)} />
            </Field>
            <Field label="Free delivery from (Rs.)" htmlFor="freeShippingThreshold" hint="Counted before any coupon discount. Use 0 to always charge delivery.">
              <Input id="freeShippingThreshold" name="freeShippingThreshold" type="number" min={0} defaultValue={num("free_shipping_threshold", 2000)} />
            </Field>
          </div>
          <Field label="Courier" htmlFor="courier">
            <Input id="courier" name="courier" defaultValue={str("courier", "Leopards")} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="WhatsApp number" htmlFor="whatsapp" hint="Country code, no plus or leading zero: 923001234567.">
              <Input id="whatsapp" name="whatsapp" defaultValue={str("whatsapp_number", "923166568142")} inputMode="numeric" required />
            </Field>
            <Field label="Helpline shown to customers" htmlFor="helpline">
              <Input id="helpline" name="helpline" defaultValue={str("helpline", "0316 6568142")} required />
            </Field>
          </div>
          <Field label="Contact email shown to customers" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={str("contact_email", "Glanceofgold@gmail.com")} required />
          </Field>
        </ActionForm>
      </Panel>
    </>
  );
}
