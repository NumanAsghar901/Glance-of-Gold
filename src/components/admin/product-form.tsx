"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { saveProduct } from "@/app/actions/admin-catalog";
import { ActionForm } from "@/components/admin/action-form";
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
  material: string;
  tags: string;
  isActive: boolean;
  isFeatured: boolean;
  variants: { id: number | null; name: string; sku: string; stock: number; priceOverride: number | null; isActive: boolean }[];
};

type Row = ProductFormData["variants"][number] & { key: string };

let counter = 0;
const newKey = () => `v${++counter}`;

export function ProductForm({
  product,
  categories,
}: {
  product: ProductFormData;
  categories: { id: number; name: string }[];
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    (product.variants.length
      ? product.variants
      : [{ id: null, name: "Standard", sku: "", stock: 0, priceOverride: null, isActive: true }]
    ).map((v) => ({ ...v, key: newKey() })),
  );

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <ActionForm action={saveProduct} submitLabel={product.id ? "Save product" : "Create product"}>
      {product.id && <input type="hidden" name="id" value={product.id} />}
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(
          rows.map(({ id, name, sku, stock, priceOverride, isActive }) => ({ id, name, sku, stock, priceOverride, isActive })),
        )}
      />

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
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Price (Rs.)" htmlFor="price">
              <Input id="price" name="price" type="number" inputMode="numeric" min={0} step={1} defaultValue={product.price} required />
            </Field>
            <Field label="Original price (Rs.)" htmlFor="compareAtPrice" hint="Optional. Shows a discount when higher than the price.">
              <Input id="compareAtPrice" name="compareAtPrice" type="number" inputMode="numeric" min={0} step={1} defaultValue={product.compareAtPrice ?? ""} />
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
        title="Variants and stock"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((rs) => [...rs, { key: newKey(), id: null, name: "", sku: "", stock: 0, priceOverride: null, isActive: true }])
            }
          >
            <Plus /> Add variant
          </Button>
        }
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Use one variant named Standard for simple pieces. Add variants for sizes, for example Size 6, Size 7.
        </p>
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.key} className="grid gap-3 border border-border p-4 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
              <Field label="Variant name" htmlFor={`vn-${r.key}`}>
                <Input id={`vn-${r.key}`} value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} placeholder="Standard" />
              </Field>
              <Field label="In stock" htmlFor={`vs-${r.key}`}>
                <Input id={`vs-${r.key}`} type="number" inputMode="numeric" min={0} value={r.stock} onChange={(e) => update(r.key, { stock: Number(e.target.value) })} />
              </Field>
              <Field label="Price (optional)" htmlFor={`vp-${r.key}`}>
                <Input
                  id={`vp-${r.key}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={r.priceOverride ?? ""}
                  placeholder="Same as product"
                  onChange={(e) => update(r.key, { priceOverride: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </Field>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={r.isActive} onChange={(e) => update(r.key, { isActive: e.target.checked })} className="size-4 accent-[var(--gold)]" />
                  Active
                </label>
                <button
                  type="button"
                  aria-label={`Remove variant ${r.name || ""}`}
                  disabled={rows.length === 1}
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  className="grid size-10 place-items-center text-muted-foreground transition-colors hover:text-danger disabled:opacity-30"
                >
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={product.id ? "Add more photos" : "Photos"}>
        <Field label="Upload photos" htmlFor="images" hint="JPG, PNG, WebP or AVIF, up to 5 MB each. The first photo is the main image; the second appears when someone hovers over the product.">
          <input
            id="images"
            name="images"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="w-full border border-border bg-surface px-3 py-3 text-sm file:mr-4 file:border-0 file:bg-sand file:px-4 file:py-2 file:text-sm"
          />
        </Field>
      </Panel>
    </ActionForm>
  );
}
