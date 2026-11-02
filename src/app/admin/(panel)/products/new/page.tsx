import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const [{ data: categories }, { error: groupsMissing }, { error: stockMissing }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort"),
    // Fail until the variant groups migration has been run; the form then explains what to do.
    supabase.from("product_option_groups").select("id").limit(1),
    supabase.from("products").select("stock").limit(1),
  ]);

  return (
    <>
      <Link prefetch={false} href="/admin/products" className="link-draw mb-6 inline-flex items-center gap-2 text-sm">
        <ArrowLeft className="size-4" strokeWidth={1.5} /> All products
      </Link>
      <PageHeader title="Add product" description="Add the details, set the stock and upload photos. You can edit everything later." />
      <ProductForm
        categories={categories ?? []}
        ready={!groupsMissing && !stockMissing}
        product={{
          name: "",
          slug: "",
          categoryId: null,
          description: "",
          price: "",
          compareAtPrice: null,
          material: "",
          tags: "",
          isActive: true,
          isFeatured: false,
          stock: "",
          groups: [],
        }}
      />
    </>
  );
}
