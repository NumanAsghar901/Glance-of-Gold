import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  Category,
  ProductDetail,
  ProductImage,
  ProductSummary,
  ProductVariant,
} from "@/lib/data/types";

/**
 * Public catalogue reads. Everything goes through the cookie-less anon client
 * (RLS exposes only active data) and is cached with the "catalog" tag, so admin
 * edits can refresh pages on demand with updateTag("catalog").
 */

const PAGE_SIZE = 12;
const REVALIDATE = 300;

type RawProduct = {
  id: number;
  slug: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  is_featured: boolean;
  description?: string | null;
  material?: string | null;
  tags?: string[];
  category: { name: string; slug: string } | null;
  images: (ProductImage & { sort: number })[];
  variants: { id: number; name: string; stock: number; price_override: number | null; sort: number }[];
};

const SUMMARY_SELECT =
  "id, slug, name, price, compare_at_price, is_featured, category:categories(name, slug), images:product_images(url, alt, sort, blur_data_url), variants:product_variants(id, name, stock, price_override, sort)";
const SUMMARY_SELECT_INNER =
  "id, slug, name, price, compare_at_price, is_featured, category:categories!inner(name, slug), images:product_images(url, alt, sort, blur_data_url), variants:product_variants(id, name, stock, price_override, sort)";
const DETAIL_SELECT = `${SUMMARY_SELECT}, description, material, tags`;

function toSummary(r: RawProduct): ProductSummary {
  const images = [...r.images]
    .sort((a, b) => a.sort - b.sort)
    .map(({ url, alt, blur_data_url }) => ({ url, alt, blur_data_url }));
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    price: r.price,
    compareAtPrice: r.compare_at_price,
    isFeatured: r.is_featured,
    category: r.category,
    images,
    inStock: r.variants.some((v) => v.stock > 0),
    quickAdd:
      r.variants.length === 1
        ? { variantId: r.variants[0].id, variantName: r.variants[0].name, stock: r.variants[0].stock }
        : null,
  };
}

function toDetail(r: RawProduct): ProductDetail {
  const variants: ProductVariant[] = [...r.variants]
    .sort((a, b) => a.sort - b.sort)
    .map((v) => ({ id: v.id, name: v.name, stock: v.stock, priceOverride: v.price_override }));
  return {
    ...toSummary(r),
    description: r.description ?? null,
    material: r.material ?? null,
    tags: r.tags ?? [],
    variants,
  };
}

export type ProductSort = "newest" | "price-asc" | "price-desc" | "featured";

export type ProductQuery = {
  category?: string;
  sort?: ProductSort;
  min?: number;
  max?: number;
  page?: number;
  pageSize?: number;
  featuredOnly?: boolean;
};

export type ProductPage = {
  items: ProductSummary[];
  total: number;
  page: number;
  pageCount: number;
};

export const getProducts = unstable_cache(
  async (query: ProductQuery = {}): Promise<ProductPage> => {
    const supabase = createPublicClient();
    const pageSize = query.pageSize ?? PAGE_SIZE;
    const page = Math.max(1, query.page ?? 1);

    let q = supabase
      .from("products")
      .select(query.category ? SUMMARY_SELECT_INNER : SUMMARY_SELECT, { count: "exact" });

    if (query.category) q = q.eq("categories.slug", query.category);
    if (query.featuredOnly) q = q.eq("is_featured", true);
    if (query.min !== undefined) q = q.gte("price", query.min);
    if (query.max !== undefined) q = q.lte("price", query.max);

    switch (query.sort) {
      case "price-asc":
        q = q.order("price", { ascending: true });
        break;
      case "price-desc":
        q = q.order("price", { ascending: false });
        break;
      case "featured":
        q = q.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
        break;
      default:
        q = q.order("created_at", { ascending: false });
    }
    q = q.order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await q;
    if (error) throw new Error(`getProducts: ${error.message}`);

    const total = count ?? 0;
    return {
      items: (data as unknown as RawProduct[]).map(toSummary),
      total,
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
  ["products"],
  { tags: ["catalog"], revalidate: REVALIDATE },
);

export const getProduct = unstable_cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(DETAIL_SELECT)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`getProduct: ${error.message}`);
    return data ? toDetail(data as unknown as RawProduct) : null;
  },
  ["product"],
  { tags: ["catalog"], revalidate: REVALIDATE },
);

export const getRelatedProducts = unstable_cache(
  async (categorySlug: string | null, excludeId: number, limit = 4): Promise<ProductSummary[]> => {
    const supabase = createPublicClient();
    let q = supabase
      .from("products")
      .select(categorySlug ? SUMMARY_SELECT_INNER : SUMMARY_SELECT)
      .neq("id", excludeId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (categorySlug) q = q.eq("categories.slug", categorySlug);
    const { data, error } = await q;
    if (error) throw new Error(`getRelatedProducts: ${error.message}`);
    return (data as unknown as RawProduct[]).map(toSummary);
  },
  ["related"],
  { tags: ["catalog"], revalidate: REVALIDATE },
);

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, description, image_url")
      .order("sort");
    if (error) throw new Error(`getCategories: ${error.message}`);
    return data;
  },
  ["categories"],
  { tags: ["catalog"], revalidate: REVALIDATE },
);

export const searchProducts = unstable_cache(
  async (term: string): Promise<ProductSummary[]> => {
    const supabase = createPublicClient();
    const { data: hits, error } = await supabase.rpc("search_products", { q: term, lim: 24 });
    if (error) throw new Error(`searchProducts: ${error.message}`);
    if (!hits.length) return [];

    const ids = hits.map((h) => h.id);
    const { data, error: e2 } = await supabase.from("products").select(SUMMARY_SELECT).in("id", ids);
    if (e2) throw new Error(`searchProducts: ${e2.message}`);

    const byId = new Map((data as unknown as RawProduct[]).map((p) => [p.id, toSummary(p)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },
  ["search"],
  { tags: ["catalog"], revalidate: 120 },
);

export const getAllProductSlugs = unstable_cache(
  async (): Promise<{ slug: string; updatedAt: string }[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.from("products").select("slug, updated_at");
    if (error) throw new Error(`getAllProductSlugs: ${error.message}`);
    return data.map((p) => ({ slug: p.slug, updatedAt: p.updated_at }));
  },
  ["product-slugs"],
  { tags: ["catalog"], revalidate: 3600 },
);
