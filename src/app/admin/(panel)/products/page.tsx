import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { deleteSampleProducts } from "@/app/actions/admin-catalog";
import { ActionButton } from "@/components/admin/action-form";
import { Empty, Input, PageHeader, Pill, TableWrap, td, th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { formatPKR } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 30;

type Row = {
  id: number;
  name: string;
  price: number;
  is_active: boolean;
  is_featured: boolean;
  is_sample: boolean;
  category: { name: string } | null;
  images: { url: string; sort: number }[];
  variants: { stock: number }[];
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[%,()]/g, " ").trim().slice(0, 60);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  let query = supabase
    .from("products")
    .select("id, name, price, is_active, is_featured, is_sample, category:categories(name), images:product_images(url, sort), variants:product_variants(stock)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, count } = await query;
  const products = (data ?? []) as unknown as Row[];
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const sampleCount = products.filter((p) => p.is_sample).length;

  return (
    <>
      <PageHeader
        title="Products"
        description={`${count ?? 0} ${count === 1 ? "product" : "products"} in the store.`}
        actions={
          <Button href="/admin/products/new">
            <Plus /> Add product
          </Button>
        }
      />

      {sampleCount > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-gold bg-sand/50 p-4 text-sm">
          <p className="max-w-xl">
            Some products are sample data used to preview the store. Remove them once you have added your own.
          </p>
          <ActionButton action={deleteSampleProducts} confirm="Delete all sample products and their photos? This cannot be undone.">
            Delete sample products
          </ActionButton>
        </div>
      )}

      <form action="/admin/products" className="mb-4 flex gap-2">
        <label htmlFor="q" className="sr-only">Search products</label>
        <Input id="q" name="q" defaultValue={q} placeholder="Search by name" className="max-w-sm" />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {products.length === 0 ? (
        <Empty>No products found. Add your first product to start selling.</Empty>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[40rem] border-collapse">
            <thead>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Category</th>
                <th className={th}>Price</th>
                <th className={th}>Stock</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const img = [...p.images].sort((a, b) => a.sort - b.sort)[0];
                const stock = p.variants.reduce((n, v) => n + v.stock, 0);
                return (
                  <tr key={p.id} className="transition-colors hover:bg-sand/40">
                    <td className={td}>
                      <Link prefetch={false} href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-sand">
                          {img && <Image src={img.url} alt="" fill sizes="44px" quality={60} className="object-cover" />}
                        </span>
                        <span className="font-medium underline-offset-4 hover:underline">{p.name}</span>
                      </Link>
                    </td>
                    <td className={td}>{p.category?.name ?? "None"}</td>
                    <td className={td}>{formatPKR(p.price)}</td>
                    <td className={td}>
                      <Pill tone={stock === 0 ? "bad" : stock <= 3 ? "warn" : "neutral"}>{stock === 0 ? "Sold out" : stock}</Pill>
                    </td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1.5">
                        <Pill tone={p.is_active ? "good" : "neutral"}>{p.is_active ? "Visible" : "Hidden"}</Pill>
                        {p.is_featured && <Pill tone="warn">Featured</Pill>}
                        {p.is_sample && <Pill>Sample</Pill>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? <Link prefetch={false} href={`/admin/products?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`} className="link-draw">Previous</Link> : <span />}
          <span className="text-muted-foreground">Page {page} of {pageCount}</span>
          {page < pageCount ? <Link prefetch={false} href={`/admin/products?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`} className="link-draw">Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}
