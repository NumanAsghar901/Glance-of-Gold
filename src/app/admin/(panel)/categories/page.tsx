import type { Metadata } from "next";
import Image from "next/image";
import { deleteCategory, saveCategory } from "@/app/actions/admin-catalog";
import { ActionButton, ActionForm } from "@/components/admin/action-form";
import { Check, Field, Input, PageHeader, Panel, Pill, Textarea } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Categories" };

type Cat = { id?: number; name: string; slug: string; description: string; sort: number; is_active: boolean; image_url?: string | null };

function Fields({ c, prefix }: { c: Cat; prefix: string }) {
  return (
    <>
      {c.id && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${prefix}-name`}>
          <Input id={`${prefix}-name`} name="name" defaultValue={c.name} required />
        </Field>
        <Field label="URL name" htmlFor={`${prefix}-slug`} hint="Leave empty to create it from the name.">
          <Input id={`${prefix}-slug`} name="slug" defaultValue={c.slug} />
        </Field>
      </div>
      <Field label="Short description" htmlFor={`${prefix}-desc`}>
        <Textarea id={`${prefix}-desc`} name="description" rows={2} defaultValue={c.description} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order in menus" htmlFor={`${prefix}-sort`} hint="Lower numbers come first.">
          <Input id={`${prefix}-sort`} name="sort" type="number" min={0} defaultValue={c.sort} />
        </Field>
        <Field label="Home page photo" htmlFor={`${prefix}-image`} hint="Optional. Shown on the home page category tiles.">
          <input id={`${prefix}-image`} name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="w-full border border-border bg-surface px-3 py-2.5 text-sm file:mr-4 file:border-0 file:bg-sand file:px-4 file:py-1.5 file:text-sm" />
        </Field>
      </div>
      <Check name="isActive" label="Visible in the store" defaultChecked={c.is_active} />
    </>
  );
}

export default async function CategoriesPage() {
  const { supabase } = await requireAdmin();
  const [{ data: categories }, { data: counts }] = await Promise.all([
    supabase.from("categories").select("*").order("sort").order("id"),
    supabase.from("products").select("category_id"),
  ]);
  const countBy = new Map<number, number>();
  for (const p of counts ?? []) if (p.category_id) countBy.set(p.category_id, (countBy.get(p.category_id) ?? 0) + 1);

  return (
    <>
      <PageHeader title="Categories" description="Group products so customers can browse by type." />

      <Panel title="Add a category" className="mb-8">
        <ActionForm action={saveCategory} submitLabel="Add category">
          <Fields prefix="new" c={{ name: "", slug: "", description: "", sort: (categories?.length ?? 0) + 1, is_active: true }} />
        </ActionForm>
      </Panel>

      <ul className="space-y-4">
        {categories?.map((c) => (
          <li key={c.id}>
            <details className="group border border-border bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="relative size-12 shrink-0 overflow-hidden bg-sand">
                    {c.image_url && <Image src={c.image_url} alt="" fill sizes="48px" quality={60} className="object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-heading text-xl">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">{countBy.get(c.id) ?? 0} products</span>
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {!c.is_active && <Pill>Hidden</Pill>}
                  <span className="text-sm text-muted-foreground group-open:hidden">Edit</span>
                </span>
              </summary>
              <div className="space-y-6 border-t border-border p-5">
                <ActionForm action={saveCategory}>
                  <Fields prefix={`c${c.id}`} c={{ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", sort: c.sort, is_active: c.is_active, image_url: c.image_url }} />
                </ActionForm>
                <div className="border-t border-border pt-5">
                  <ActionButton action={deleteCategory} fields={{ id: c.id }} confirm={`Delete the ${c.name} category? Its products stay in the store without a category.`}>
                    Delete category
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
