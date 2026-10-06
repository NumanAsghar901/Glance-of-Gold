import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  Category,
  OptionLabel,
  ProductDetail,
  ProductImage,
  ProductSummary,
  ProductVariant,
} from "@/lib/data/types";
import { stockStatus } from "@/lib/stock";
import { variantLabel } from "@/lib/variant-name";

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
  rating_avg?: number | null;
  rating_count?: number | null;
  sold_count?: number | null;
  option_label?: string | null;
  allow_multiple?: boolean | null;
  category: { name: string; slug: string } | null;
  images: (ProductImage & { sort: number })[];
  variants: { id: number; name: string; color?: string | null; stock: number; price_override: number | null; sort: number }[];
};

const BASE_COLUMNS = "id, slug, name, price, compare_at_price, is_featured";
const STATS = "rating_avg, rating_count, sold_count";
const relations = (options: boolean) =>
  `images:product_images(url, alt, sort, blur_data_url), variants:product_variants(id, name, stock, price_override, sort${options ? ", color" : ""})`;

/**
 * Some columns come from later migrations (ratings and sold counts, then colours and options). Until a
 * migration has been run on the database the shop must keep working, so the queries leave those
 * columns out. A missing column is re-checked at most every 30 seconds.
 */
const probes = new Map<string, { ok: boolean; at: number }>();
async function columnAvailable(key: string, column: string): Promise<boolean> {
  const hit = probes.get(key);
  if (hit && (hit.ok || Date.now() - hit.at < 30_000)) return hit.ok;
  const { error } = await createPublicClient().from("products").select(column).limit(1);
  probes.set(key, { ok: !error, at: Date.now() });
  return !error;
}
const statsAvailable = () => columnAvailable("stats", "sold_count");
const optionsAvailable = () => columnAvailable("options", "allow_multiple");

const summarySelect = (inner: boolean, stats: boolean, options = false) =>
  `${BASE_COLUMNS}${stats ? `, ${STATS}` : ""}, category:categories${inner ? "!inner" : ""}(name, slug), ${relations(options)}`;
const detailSelect = (stats: boolean, options: boolean) =>
  `${summarySelect(false, stats, options)}, description, material, tags${options ? ", option_label, allow_multiple" : ""}`;

function toSummary(r: RawProduct): ProductSummary {
  const images = [...r.images]
    .sort((a, b) => a.sort - b.sort)
    .map(({ url, alt, blur_data_url }) => ({ url, alt, blur_data_url }));
  const unitsLeft = r.variants.reduce((n, v) => n + Math.max(0, v.stock), 0);
  const status = stockStatus(unitsLeft);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    price: r.price,
    compareAtPrice: r.compare_at_price,
    isFeatured: r.is_featured,
    category: r.category,
    images,
    inStock: status !== "out",
    lowStock: status === "low",
    rating: Number(r.rating_avg ?? 0),
    ratingCount: r.rating_count ?? 0,
    soldCount: r.sold_count ?? 0,
    quickAdd:
      r.variants.length === 1
        ? { variantId: r.variants[0].id, variantName: r.variants[0].name, stock: r.variants[0].stock }
        : null,
  };
}

function toDetail(r: RawProduct): ProductDetail {
  const variants: ProductVariant[] = [...r.variants]
    .sort((a, b) => a.sort - b.sort)
    .map((v) => ({
      id: v.id,
      name: v.name,
      color: v.color ?? null,
      label: variantLabel(v.name, v.color),
      stock: v.stock,
      priceOverride: v.price_override,
    }));
  const optionLabel: OptionLabel = r.option_label === "Size" || r.option_label === "Design" ? r.option_label : "Option";
  return {
    ...toSummary(r),
    description: r.description ?? null,
    material: r.material ?? null,
    tags: r.tags ?? [],
    variants,
    optionLabel,
    allowMultiple: r.allow_multiple ?? false,
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

    const stats = await statsAvailable();
    let q = supabase.from("products").select(summarySelect(!!query.category, stats), { count: "exact" });

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
  // The key carries a version: bump it whenever the shape of a cached product changes, because the
  // data cache survives deployments and would otherwise hand old-shaped objects to new code.
  ["products-v2"],
  { tags: ["catalog"], revalidate: REVALIDATE },
);

export const getProduct = unstable_cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const supabase = createPublicClient();
    const [stats, options] = await Promise.all([statsAvailable(), optionsAvailable()]);
    const { data, error } = await supabase.from("products").select(detailSelect(stats, options)).eq("slug", slug).maybeSingle();
    if (error) throw new Error(`getProduct: ${error.message}`);
    return data ? toDetail(data as unknown as RawProduct) : null;
  },
  ["product-v2"],
  { tags: ["catalog"], revalidate: REVALIDATE },
);

export const getRelatedProducts = unstable_cache(
  async (categorySlug: string | null, excludeId: number, limit = 4): Promise<ProductSummary[]> => {
    const supabase = createPublicClient();
    let q = supabase
      .from("products")
      .select(summarySelect(!!categorySlug, await statsAvailable()))
      .neq("id", excludeId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (categorySlug) q = q.eq("categories.slug", categorySlug);
    const { data, error } = await q;
    if (error) throw new Error(`getRelatedProducts: ${error.message}`);
    return (data as unknown as RawProduct[]).map(toSummary);
  },
  ["related-v2"],
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
    const { data, error: e2 } = await supabase.from("products").select(summarySelect(false, await statsAvailable())).in("id", ids);
    if (e2) throw new Error(`searchProducts: ${e2.message}`);

    const byId = new Map((data as unknown as RawProduct[]).map((p) => [p.id, toSummary(p)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },
  ["search-v2"],
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
