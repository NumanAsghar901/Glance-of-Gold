"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { saveProduct } from "@/app/actions/admin-catalog";
import { ActionForm } from "@/components/admin/action-form";
import { CloudinaryUploader } from "@/components/admin/cloudinary-uploader";
import { Check, Field, Input, Panel, Select, Textarea } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export type ProductFormData = {
  id?: number;
  name: string;
  slug: string;
  categoryId: number | null;
  description: string;
  price: number | "";
  compareAtPrice: number | null;
  /** Pieces in stock: one number for the whole product. */
  stock: number | "";
  material: string;
  tags: string;
  isActive: boolean;
  isFeatured: boolean;
  /** Variant groups: a heading with the sizes and colours a customer can choose from. */
  groups: { id: number | null; heading: string; sizes: string[]; colours: string[] }[];
};

/** A group as it is edited: the sizes and colours are typed as one comma separated line each. */
type Row = { key: string; id: number | null; heading: string; sizes: string; colours: string };

const MAX_GROUPS = 20;
const splitList = (text: string) => [...new Set(text.split(",").map((x) => x.trim()).filter(Boolean))];

/** "Nose Ring 1" becomes "Nose Ring 2": a copy of a group gets the next number when its heading ends in one. */
function nextHeading(heading: string) {
  const m = heading.match(/^(.*?)(\d+)\s*$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : heading ? `${heading} 2` : "";
}

export function ProductForm({
  product,
  categories,
  ready,
}: {
  product: ProductFormData;
  categories: { id: number; name: string }[];
  /** False until the variant groups migration (20261103000001) has been run on the database. */
  ready: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    product.groups.map((g, i) => ({ key: `g${i}`, id: g.id, heading: g.heading, sizes: g.sizes.join(", "), colours: g.colours.join(", ") })),
  );
  // Row keys are built per form (not from a counter shared by every render), so the ids in the server
  // HTML and in the browser are the same.
  const nextKey = useRef(rows.length);

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = (from?: Row) =>
    setRows((rs) =>
      rs.length >= MAX_GROUPS
        ? rs
        : [...rs, { key: `g${nextKey.current++}`, id: null, heading: from ? nextHeading(from.heading) : "", sizes: from?.sizes ?? "", colours: from?.colours ?? "" }],
    );

  return (
    <ActionForm action={saveProduct} submitLabel={product.id ? "Save product" : "Create product"}>
      {product.id && <input type="hidden" name="id" value={product.id} />}
      <input
        type="hidden"
        name="groups"
        value={JSON.stringify(rows.map((r) => ({ id: r.id, heading: r.heading, sizes: splitList(r.sizes), colours: splitList(r.colours) })))}
      />

      {!ready && (
        <p className="border border-gold bg-sand/50 p-4 text-sm leading-relaxed">
          Variant groups and one stock number per product need a database step first. Run{" "}
          <code className="bg-surface px-1.5 py-0.5 text-xs">supabase/migrations/20261103000001_option_groups.sql</code> once in the Supabase SQL
          Editor, then reload this page.
        </p>
      )}

      <Panel title="Details">
        <div className="space-y-5">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" defaultValue={product.name} required />
          </Field>
          <Field label="Description" htmlFor="description" hint="Shown on the product page.">
            <Textarea id="description" name="description" rows={4} defaultValue={product.description} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" htmlFor="categoryId">
              <Select id="categoryId" name="categoryId" defaultValue={product.categoryId ?? ""}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Material or finish" htmlFor="material">
              <Input id="material" name="material" defaultValue={product.material} placeholder="e.g. Gold plated" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Price (Rs.)" htmlFor="price" hint="For one piece, whatever size or colour.">
              <Input id="price" name="price" type="number" inputMode="numeric" min={0} step={1} defaultValue={product.price} required />
            </Field>
            <Field label="Original price (Rs.)" htmlFor="compareAtPrice" hint="Optional. Shows a discount when higher than the price.">
              <Input id="compareAtPrice" name="compareAtPrice" type="number" inputMode="numeric" min={0} step={1} defaultValue={product.compareAtPrice ?? ""} />
            </Field>
            <Field label="In stock" htmlFor="stock" hint="Pieces you have in all, across every size and colour.">
              <Input id="stock" name="stock" type="number" inputMode="numeric" min={0} step={1} defaultValue={product.stock} required />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Tags" htmlFor="tags" hint="Comma separated, e.g. bridal, gift.">
              <Input id="tags" name="tags" defaultValue={product.tags} />
            </Field>
            <Field label="URL name" htmlFor="slug" hint="Leave empty to create it from the name.">
              <Input id="slug" name="slug" defaultValue={product.slug} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <Check name="isActive" label="Visible in the store" defaultChecked={product.isActive} />
            <Check name="isFeatured" label="Featured on the home page" defaultChecked={product.isFeatured} />
          </div>
        </div>
      </Panel>

      <Panel
        title="Variant groups"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => add()} disabled={rows.length >= MAX_GROUPS}>
            <Plus /> Add a group
          </Button>
        }
      >
        <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
          Each group has a heading, such as Nose Ring 1, with the sizes and colours a customer can choose from. A product can have several groups.
          Customers choose one or more sizes and colours from each group and set how many of each. Leave this empty for a product with nothing to
          choose.
        </p>

        {rows.length === 0 ? (
          <p className="border border-dashed border-border p-4 text-sm text-muted-foreground">
            No groups yet. This product is sold as it is, with only a quantity to choose.
          </p>
        ) : (
          <ul className="space-y-4">
            {rows.map((r, i) => {
              const sizes = splitList(r.sizes);
              const colours = splitList(r.colours);
              return (
                <li key={r.key} className="border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Field label={`Heading, group ${i + 1}`} htmlFor={`gh-${r.key}`} className="min-w-0 flex-1">
                      <Input id={`gh-${r.key}`} value={r.heading} maxLength={60} placeholder="Nose Ring 1" onChange={(e) => update(r.key, { heading: e.target.value })} />
                    </Field>
                    <div className="mt-6 flex shrink-0 items-center">
                      <button
                        type="button"
                        aria-label={`Copy ${r.heading || `group ${i + 1}`}`}
                        title="Copy this group"
                        disabled={rows.length >= MAX_GROUPS}
                        onClick={() => add(r)}
                        className="grid size-10 place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                      >
                        <Copy className="size-4" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${r.heading || `group ${i + 1}`}`}
                        title="Remove this group"
                        onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                        className="grid size-10 place-items-center text-muted-foreground transition-colors hover:text-danger"
                      >
                        <Trash2 className="size-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Sizes" htmlFor={`gs-${r.key}`} hint="Separate with commas, for example 6mm, 8mm, 10mm. Leave empty if there are none.">
                      <Input id={`gs-${r.key}`} value={r.sizes} placeholder="6mm, 8mm, 10mm" onChange={(e) => update(r.key, { sizes: e.target.value })} />
                    </Field>
                    <Field label="Colours" htmlFor={`gc-${r.key}`} hint="Separate with commas, for example silver, gold. Leave empty if there are none.">
                      <Input id={`gc-${r.key}`} value={r.colours} placeholder="silver, gold" onChange={(e) => update(r.key, { colours: e.target.value })} />
                    </Field>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {sizes.length + colours.length === 0
                      ? "Add at least one size or colour."
                      : `Customers will see ${sizes.length === 1 ? "1 size" : `${sizes.length} sizes`} and ${colours.length === 1 ? "1 colour" : `${colours.length} colours`}.`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title={product.id ? "Add more photos" : "Photos"}>
        <Field
          label="Upload photos"
          htmlFor="images"
          hint="Portrait photos look best, such as 1200 x 1500. Use the original from your camera: photos go straight to our image storage and are kept at up to 2000 pixels on the longest side. The first photo is the main image; the second appears when someone hovers over the product."
        >
          <CloudinaryUploader id="images" />
        </Field>
      </Panel>
    </ActionForm>
  );
}
