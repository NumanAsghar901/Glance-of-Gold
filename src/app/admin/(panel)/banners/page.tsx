import type { Metadata } from "next";
import Image from "next/image";
import { deleteBanner, saveBanner } from "@/app/actions/admin-marketing";
import { ActionButton, ActionForm } from "@/components/admin/action-form";
import { ImageSizeNote, PhotoInput } from "@/components/admin/photo-input";
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
        <Field label="Wide photo (computers and tablets)" htmlFor={`${p}-img`} hint="Landscape, best 2400 x 1200 (at least 1600 x 800), about twice as wide as tall. Keep the left half calm because the headline sits there. Large photos are reduced for you.">
          <PhotoInput id={`${p}-img`} name="image" slot="banner-wide" required={!b.id} />
        </Field>
        <Field label="Tall photo (phones, optional)" htmlFor={`${p}-mimg`} hint="Portrait like a phone screen, best 1080 x 1920 (at least 750 x 1300), with the subject in the top half. Without it the wide photo is cropped to fit, and a phone shows only a narrow slice of it.">
          <PhotoInput id={`${p}-mimg`} name="mobileImage" slot="banner-tall" />
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
          {(b.image_url || b.mobile_image_url) && (
            <div className="w-full space-y-1.5">
              {b.image_url && <ImageSizeNote url={b.image_url} slot="banner-wide" />}
              {b.mobile_image_url && <ImageSizeNote url={b.mobile_image_url} slot="banner-tall" />}
              {!b.mobile_image_url && (
                <p className="text-xs leading-relaxed text-gold-hover">
                  No tall photo for phones yet. Phones then show only a narrow slice of the wide photo, stretched, which looks blurry. Add a tall photo above.
                </p>
              )}
            </div>
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
