import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { deleteImage, deleteProduct, makePrimaryImage } from "@/app/actions/admin-catalog";
import { ActionButton } from "@/components/admin/action-form";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader, Panel, Pill } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const parsed = z.coerce.number().int().positive().safeParse((await params).id);
  if (!parsed.success) notFound();
  const id = parsed.data;

  const [{ data: product }, { data: categories }, { data: images }, { data: variants }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("sort"),
    supabase.from("product_images").select("*").eq("product_id", id).order("sort").order("id"),
    supabase.from("product_variants").select("*").eq("product_id", id).order("sort").order("id"),
  ]);
  if (!product) notFound();

  return (
    <>
      <Link prefetch={false} href="/admin/products" className="link-draw mb-6 inline-flex items-center gap-2 text-sm">
        <ArrowLeft className="size-4" strokeWidth={1.5} /> All products
      </Link>
      <PageHeader
        title={product.name}
        description={product.is_sample ? "This is a sample product used to preview the store." : undefined}
        actions={
          <Link prefetch={false} href={`/product/${product.slug}`} target="_blank" className="link-draw inline-flex items-center gap-2 text-sm">
            View in store <ExternalLink className="size-4" strokeWidth={1.5} />
          </Link>
        }
      />

      <div className="space-y-6">
        <Panel title="Photos">
          {images?.length ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {images.map((img, i) => (
                <li key={img.id} className="space-y-2">
                  <div className="relative aspect-[4/5] overflow-hidden bg-sand">
                    <Image src={img.url} alt={img.alt} fill sizes="200px" quality={60} className="object-cover" />
                    {i === 0 && (
                      <span className="absolute left-2 top-2">
                        <Pill tone="good">Main</Pill>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {i !== 0 && (
                      <ActionButton action={makePrimaryImage} fields={{ id: img.id, productId: id }}>
                        Make main
                      </ActionButton>
                    )}
                    <ActionButton action={deleteImage} fields={{ id: img.id }} confirm="Delete this photo?">
                      Delete
                    </ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No photos yet. Upload some below.</p>
          )}
        </Panel>

        <ProductForm
          categories={categories ?? []}
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            categoryId: product.category_id,
            description: product.description ?? "",
            price: product.price,
            compareAtPrice: product.compare_at_price,
            material: product.material ?? "",
            tags: product.tags.join(", "),
            isActive: product.is_active,
            isFeatured: product.is_featured,
            variants: (variants ?? []).map((v) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              stock: v.stock,
              priceOverride: v.price_override,
              isActive: v.is_active,
            })),
          }}
        />

        <Panel title="Delete product">
          <p className="mb-4 max-w-xl text-sm text-muted-foreground">
            Removes this product and its photos from the store. Past orders keep their details. To hide it without deleting, untick Visible in the store above.
          </p>
          <ActionButton action={deleteProduct} fields={{ id }} confirm={`Delete ${product.name}? This cannot be undone.`}>
            Delete this product
          </ActionButton>
        </Panel>
      </div>
    </>
  );
}
