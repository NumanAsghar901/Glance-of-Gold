"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { saveProduct } from "@/app/actions/admin-catalog";
import { ActionForm } from "@/components/admin/action-form";
import { Check, Field, Input, Panel, Select, Textarea } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
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
  /** Whether customers may pick several designs or sizes at once, each with its own quantity. */
  allowMultiple: boolean;
  /**
   * A variant is one thing a customer can buy. Its colour, design and size are kept apart and joined into its
   * name when saved. `name` is only used by the older form, before the design and size migration.
   */
  variants: {
    id: number | null;
    name: string;
    color: string;
    design: string;
    size: string;
    sku: string;
    stock: number;
    priceOverride: number | null;
    isActive: boolean;
  }[];
};

type Row = ProductFormData["variants"][number] & { key: string };

const MAX_VARIANTS = 40;
const splitList = (text: string) => [...new Set(text.split(",").map((x) => x.trim()).filter(Boolean))];
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function ProductForm({
  product,
  categories,
  attrsAvailable,
}: {
  product: ProductFormData;
  categories: { id: number; name: string }[];
  /** False until the design and size migration has been run on the database. */
  attrsAvailable: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    (product.variants.length
      ? product.variants
      : [{ id: null, name: "Standard", color: "", design: "", size: "", sku: "", stock: 0, priceOverride: null, isActive: true }]
    ).map((v, i) => ({ ...v, key: `v${i}` })),
  );
  // Row keys are built per form (not from a counter shared by every render), so the ids in the server
  // HTML and in the browser are the same.
  const nextKey = useRef(rows.length);
  const [allowMultiple, setAllowMultiple] = useState(product.allowMultiple);
  const [gen, setGen] = useState({ colours: "", designs: "", sizes: "", stock: "10", price: "" });
  const [genNote, setGenNote] = useState("");

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const nameOf = (r: Row) => (attrsAvailable ? composeVariantName({ color: r.color, design: r.design, size: r.size }) : r.name || "Standard");

  /** Makes a variant for every mix of the colours, designs and sizes typed in, skipping ones already in the list. */
  function generate() {
    const colours = splitList(gen.colours);
    const designs = splitList(gen.designs);
    const sizes = splitList(gen.sizes);
    if (!colours.length && !designs.length && !sizes.length) {
      setGenNote("Type at least one colour, design or size first.");
      return;
    }
    const stock = Math.max(0, Math.floor(Number(gen.stock) || 0));
    const price = gen.price.trim() === "" ? null : Math.max(0, Math.floor(Number(gen.price) || 0));

    // The untouched starting row (Standard, no stock) is replaced rather than kept beside the new ones.
    const kept = rows.filter((r) => !(r.id === null && !r.color && !r.design && !r.size && r.stock === 0 && r.priceOverride === null));
    const fresh: Row[] = [];
    for (const color of colours.length ? colours : [""]) {
      for (const design of designs.length ? designs : [""]) {
        for (const size of sizes.length ? sizes : [""]) {
          if ([...kept, ...fresh].some((r) => same(r.color, color) && same(r.design, design) && same(r.size, size))) continue;
          fresh.push({ key: `v${nextKey.current++}`, id: null, name: "", color, design, size, sku: "", stock, priceOverride: price, isActive: true });
        }
      }
    }
    if (kept.length + fresh.length > MAX_VARIANTS) {
      setGenNote(`That would make ${kept.length + fresh.length} variants. The most for one product is ${MAX_VARIANTS}.`);
      return;
    }
    if (fresh.length === 0) {
      setGenNote("Those are already in the list.");
      return;
    }
    setRows([...kept, ...fresh]);
    setGenNote(`Added ${fresh.length} ${fresh.length === 1 ? "variant" : "variants"}. Set the stock for each one below.`);
    setGen((g) => ({ ...g, colours: "", designs: "", sizes: "" }));
  }

  return (
    <ActionForm action={saveProduct} submitLabel={product.id ? "Save product" : "Create product"}>
      {product.id && <input type="hidden" name="id" value={product.id} />}
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(
          rows.map(({ id, name, color, design, size, sku, stock, priceOverride, isActive }) => ({
            id,
            name,
            color,
            design,
            size,
            sku,
            stock,
            priceOverride,
            isActive,
          })),
        )}
      />
      {attrsAvailable && <input type="hidden" name="attrs" value="1" />}

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
              setRows((rs) =>
                rs.length >= MAX_VARIANTS
                  ? rs
                  : [...rs, { key, id: null, name: "", color: "", design: "", size: "", sku: "", stock: 0, priceOverride: null, isActive: true }],
              );
            }}
          >
            <Plus /> Add variant
          </Button>
        }
      >
        <p className="mb-4 text-sm text-muted-foreground">
          {attrsAvailable
            ? "A variant is one thing a customer can buy, with its own stock. Give it a colour, a design, a size, or any mix. Designs and sizes each get their own picker on the product page. Leave all three empty for a simple piece."
            : "Use one variant named Standard for simple pieces. Add a variant for each size, design or colour you sell, each with its own stock."}
        </p>

        {attrsAvailable ? (
          <div className="mb-5 space-y-5">
            <div className="border border-border bg-sand/40 p-4">
              <p className="text-sm font-medium">Add several at once</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Type the colours, designs and sizes you sell, separated by commas, and every mix is made for you. For example
                designs &ldquo;Design A, Design B&rdquo; and sizes &ldquo;6, 7, 8&rdquo; make six variants.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Field label="Colours" htmlFor="gen-colours">
                  <Input id="gen-colours" value={gen.colours} onChange={(e) => setGen({ ...gen, colours: e.target.value })} placeholder="Gold, Silver" />
                </Field>
                <Field label="Designs" htmlFor="gen-designs">
                  <Input id="gen-designs" value={gen.designs} onChange={(e) => setGen({ ...gen, designs: e.target.value })} placeholder="Design A, Design B" />
                </Field>
                <Field label="Sizes" htmlFor="gen-sizes">
                  <Input id="gen-sizes" value={gen.sizes} onChange={(e) => setGen({ ...gen, sizes: e.target.value })} placeholder="6, 7, 8, 9" />
                </Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Field label="Stock for each" htmlFor="gen-stock">
                  <Input id="gen-stock" type="number" inputMode="numeric" min={0} value={gen.stock} onChange={(e) => setGen({ ...gen, stock: e.target.value })} />
                </Field>
                <Field label="Price for each (optional)" htmlFor="gen-price">
                  <Input id="gen-price" type="number" inputMode="numeric" min={0} value={gen.price} onChange={(e) => setGen({ ...gen, price: e.target.value })} placeholder="Same as product" />
                </Field>
                <Button type="button" variant="outline" onClick={generate}>
                  Make variants
                </Button>
              </div>
              {genNote && (
                <p role="status" className="mt-3 text-sm">
                  {genNote}
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="allowMultiple"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--gold)]"
              />
              <span>
                Customers can choose several designs or sizes at once
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  For example two ring sizes, or three designs, in one order, each with its own quantity. The price adds up.
                </span>
              </span>
            </label>
          </div>
        ) : (
          <p className="mb-5 border border-gold bg-sand/50 p-4 text-sm leading-relaxed">
            To give colours, designs and sizes their own pickers, and to let customers choose several at once, run the database step{" "}
            <code className="bg-surface px-1.5 py-0.5 text-xs">supabase/migrations/20261006000003_variant_design_size.sql</code> once in the
            Supabase SQL Editor, then reload this page.
          </p>
        )}

        <ul className="space-y-4">
          {rows.map((r) => (
            <li
              key={r.key}
              className={
                attrsAvailable
                  ? "grid gap-3 border border-border p-4 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_0.7fr_0.9fr_auto] lg:items-end"
                  : "grid gap-3 border border-border p-4 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end"
              }
            >
              {attrsAvailable ? (
                <>
                  <Field label="Colour" htmlFor={`vc-${r.key}`}>
                    <Input id={`vc-${r.key}`} value={r.color} maxLength={30} onChange={(e) => update(r.key, { color: e.target.value })} placeholder="e.g. Gold" />
                  </Field>
                  <Field label="Design" htmlFor={`vd-${r.key}`}>
                    <Input id={`vd-${r.key}`} value={r.design} maxLength={30} onChange={(e) => update(r.key, { design: e.target.value })} placeholder="e.g. Design A" />
                  </Field>
                  <Field label="Size" htmlFor={`vz-${r.key}`}>
                    <Input id={`vz-${r.key}`} value={r.size} maxLength={30} onChange={(e) => update(r.key, { size: e.target.value })} placeholder="e.g. Size 6" />
                  </Field>
                </>
              ) : (
                <Field label="Variant name" htmlFor={`vn-${r.key}`}>
                  <Input id={`vn-${r.key}`} value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} placeholder="Standard" />
                </Field>
              )}
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
              <div className={attrsAvailable ? "flex items-center justify-between gap-4 sm:col-span-3 sm:justify-end lg:col-span-1" : "flex items-center justify-between gap-4 sm:col-span-2 sm:justify-end lg:col-span-1"}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={r.isActive} onChange={(e) => update(r.key, { isActive: e.target.checked })} className="size-4 accent-[var(--gold)]" />
                  Active
                </label>
                <button
                  type="button"
                  aria-label={`Remove variant ${nameOf(r)}`}
                  disabled={rows.length === 1}
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  className="grid size-10 place-items-center text-muted-foreground transition-colors hover:text-danger disabled:opacity-30"
                >
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </button>
              </div>
              {attrsAvailable && (
                <p className="text-xs text-muted-foreground sm:col-span-3 lg:col-span-6">Shown to customers as {nameOf(r)}</p>
              )}
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
