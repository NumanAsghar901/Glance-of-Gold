import type { Metadata } from "next";
import Image from "next/image";
import { deleteBanner, saveBanner } from "@/app/actions/admin-marketing";
import { ActionButton, ActionForm } from "@/components/admin/action-form";
import { Check, Field, Input, PageHeader, Panel, Pill } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Home banner" };

type B = {
  id?: number;
  heading: string | null;
  subheading: string | null;
  cta_label: string | null;
  cta_url: string | null;
  sort: number;
  is_active: boolean;
  image_url?: string;
  mobile_image_url?: string | null;
};

function Fields({ b, p }: { b: B; p: string }) {
  return (
    <>
      {b.id && <input type="hidden" name="id" value={b.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Wide photo (computers and tablets)" htmlFor={`${p}-img`} hint="Landscape, about 1920 x 900. Keep the left half calm because the headline sits there. JPG, PNG, WebP or AVIF, up to 5 MB.">
          <input id={`${p}-img`} name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required={!b.id} className="w-full border border-border bg-surface px-3 py-2.5 text-sm file:mr-4 file:border-0 file:bg-sand file:px-4 file:py-1.5 file:text-sm" />
        </Field>
        <Field label="Tall photo (phones, optional)" htmlFor={`${p}-mimg`} hint="Portrait, about 800 x 1000, with the subject in the top half. Without it the wide photo is cropped to fit.">
          <input id={`${p}-mimg`} name="mobileImage" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="w-full border border-border bg-surface px-3 py-2.5 text-sm file:mr-4 file:border-0 file:bg-sand file:px-4 file:py-1.5 file:text-sm" />
        </Field>
      </div>
      {b.id && (b.image_url || b.mobile_image_url) && (
        <div className="flex flex-wrap items-center gap-4 border border-border p-3">
          {b.image_url && (
            <span className="relative block h-16 w-32 overflow-hidden bg-sand">
              <Image src={b.image_url} alt="Current wide photo" fill sizes="128px" quality={60} className="object-cover" />
            </span>
          )}
          {b.mobile_image_url && (
            <>
              <span className="relative block h-16 w-12 overflow-hidden bg-sand">
                <Image src={b.mobile_image_url} alt="Current tall photo" fill sizes="48px" quality={60} className="object-cover" />
              </span>
              <Check name="removeMobileImage" label="Remove the tall photo" hint="Deletes it from storage. Uploading a new one above replaces it instead." />
            </>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Headline" htmlFor={`${p}-h`} hint="Empty uses the default headline.">
          <Input id={`${p}-h`} name="heading" defaultValue={b.heading ?? ""} maxLength={80} />
        </Field>
        <Field label="Supporting text" htmlFor={`${p}-s`}>
          <Input id={`${p}-s`} name="subheading" defaultValue={b.subheading ?? ""} maxLength={200} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Button text" htmlFor={`${p}-cl`}>
          <Input id={`${p}-cl`} name="ctaLabel" defaultValue={b.cta_label ?? ""} maxLength={40} />
        </Field>
        <Field label="Button link" htmlFor={`${p}-cu`} hint="e.g. /collections/rings">
          <Input id={`${p}-cu`} name="ctaUrl" defaultValue={b.cta_url ?? ""} />
        </Field>
        <Field label="Order" htmlFor={`${p}-so`} hint="The first active banner is used.">
          <Input id={`${p}-so`} name="sort" type="number" min={0} defaultValue={b.sort} />
        </Field>
      </div>
      <Check name="isActive" label="Showing on the home page" defaultChecked={b.is_active} />
    </>
  );
}

export default async function BannersPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("banners").select("*").order("sort").order("id");

  return (
    <>
      <PageHeader
        title="Home banners"
        description="The large rotating photos at the top of the home page. Add several and they change automatically every few seconds. While you have none, the built-in banners are shown. Deleting a banner also deletes its photos from storage."
      />

      <Panel title="Add a banner" className="mb-8">
        <ActionForm action={saveBanner} submitLabel="Add banner">
          <Fields p="new" b={{ heading: "", subheading: "", cta_label: "", cta_url: "", sort: (data?.length ?? 0) + 1, is_active: true }} />
        </ActionForm>
      </Panel>

      <ul className="space-y-4">
        {data?.map((b) => (
          <li key={b.id}>
            <details className="group border border-border bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="relative h-14 w-24 shrink-0 overflow-hidden bg-sand">
                    <Image src={b.image_url} alt="" fill sizes="96px" quality={60} className="object-cover" />
                  </span>
                  <span className="truncate font-heading text-xl">{b.heading || "Default headline"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {b.is_active ? <Pill tone="good">Showing</Pill> : <Pill>Off</Pill>}
                  <span className="text-sm text-muted-foreground group-open:hidden">Edit</span>
                </span>
              </summary>
              <div className="space-y-6 border-t border-border p-5">
                <ActionForm action={saveBanner}>
                  <Fields p={`b${b.id}`} b={b} />
                </ActionForm>
                <div className="border-t border-border pt-5">
                  <ActionButton action={deleteBanner} fields={{ id: b.id }} confirm="Delete this banner?">
                    Delete banner
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
