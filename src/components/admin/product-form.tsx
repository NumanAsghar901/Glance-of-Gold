"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { saveProduct } from "@/app/actions/admin-catalog";
import { ActionForm } from "@/components/admin/action-form";
import { Check, Field, inputCls, Input, Panel, Select, Textarea } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import type { OptionLabel } from "@/lib/data/types";
import { composeVariantName } from "@/lib/variant-name";

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
  /** What the variants are called on the product page, and whether customers may pick several at once. */
  optionLabel: OptionLabel;
  allowMultiple: boolean;
  /** `name` is the size, design or option only; `color` is kept apart and joined when saved. */
  variants: {
    id: number | null;
    name: string;
    color: string;
    sku: string;
    stock: number;
    priceOverride: number | null;
    isActive: boolean;
  }[];
};

type Row = ProductFormData["variants"][number] & { key: string };

export function ProductForm({
  product,
  categories,
  optionsAvailable,
}: {
  product: ProductFormData;
  categories: { id: number; name: string }[];
  /** False until the options migration has been run on the database. */
  optionsAvailable: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    (product.variants.length
      ? product.variants
      : [{ id: null, name: "Standard", color: "", sku: "", stock: 0, priceOverride: null, isActive: true }]
    ).map((v, i) => ({ ...v, key: `v${i}` })),
  );
  // Row keys are built per form (not from a counter shared by every render), so the ids in the server
  // HTML and in the browser are the same.
  const nextKey = useRef(rows.length);
  const [optionLabel, setOptionLabel] = useState<OptionLabel>(product.optionLabel);
  const [allowMultiple, setAllowMultiple] = useState(product.allowMultiple);
  const nameLabel = optionLabel === "Option" ? "Option name" : `${optionLabel} name`;

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <ActionForm action={saveProduct} submitLabel={product.id ? "Save product" : "Create product"}>
      {product.id && <input type="hidden" name="id" value={product.id} />}
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(
          rows.map(({ id, name, color, sku, stock, priceOverride, isActive }) => ({ id, name, color, sku, stock, priceOverride, isActive })),
        )}
      />
      {optionsAvailable && <input type="hidden" name="optionLabel" value={optionLabel} />}

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
            onClick={() => {
              const key = `v${nextKey.current++}`;
              setRows((rs) => [...rs, { key, id: null, name: "", color: "", sku: "", stock: 0, priceOverride: null, isActive: true }]);
            }}
          >
            <Plus /> Add variant
          </Button>
        }
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Use one variant named Standard for simple pieces. Add a variant for each size, design or colour you sell, each with its own stock.
        </p>

        {optionsAvailable ? (
          <div className="mb-5 grid gap-4 border border-border bg-sand/40 p-4 sm:grid-cols-2 sm:items-start">
            <Field label="The variants are" htmlFor="optionLabel" hint="Sets the heading customers see, for example Select size. Use Sizes for rings, nose rings and bangles.">
              <select
                id="optionLabel"
                value={optionLabel}
                onChange={(e) => setOptionLabel(e.target.value as OptionLabel)}
                className={inputCls}
              >
                <option value="Size">Sizes</option>
                <option value="Design">Designs</option>
                <option value="Option">Other options</option>
              </select>
            </Field>
            <div className="sm:pt-7">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="allowMultiple"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--gold)]"
                />
                <span>
                  Customers can choose several at once
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    For example two ring sizes or three designs in one order. The price adds up.
                  </span>
                </span>
              </label>
            </div>
          </div>
        ) : (
          <p className="mb-5 border border-gold bg-sand/50 p-4 text-sm leading-relaxed">
            To add colours, and to let customers choose several sizes or designs, run the database step{" "}
            <code className="bg-surface px-1.5 py-0.5 text-xs">supabase/migrations/20261006000002_product_options.sql</code> once in the Supabase
            SQL Editor, then reload this page.
          </p>
        )}

        <ul className="space-y-4">
          {rows.map((r) => (
            <li
              key={r.key}
              className={
                optionsAvailable
                  ? "grid gap-3 border border-border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_0.8fr_1fr_auto] lg:items-end"
                  : "grid gap-3 border border-border p-4 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end"
              }
            >
              {optionsAvailable && (
                <Field label="Colour (optional)" htmlFor={`vc-${r.key}`}>
                  <Input id={`vc-${r.key}`} value={r.color} maxLength={30} onChange={(e) => update(r.key, { color: e.target.value })} placeholder="e.g. Gold" />
                </Field>
              )}
              <Field label={nameLabel} htmlFor={`vn-${r.key}`}>
                <Input
                  id={`vn-${r.key}`}
                  value={r.name}
                  onChange={(e) => update(r.key, { name: e.target.value })}
                  placeholder={r.color.trim() ? "Leave empty for colour only" : "Standard"}
                />
                {optionsAvailable && r.color.trim() && (
                  <p className="mt-1 text-xs text-muted-foreground">Shown as {composeVariantName(r.color, r.name)}</p>
                )}
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
              <div className="flex items-center justify-between gap-4 sm:col-span-2 sm:justify-end lg:col-span-1">
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
