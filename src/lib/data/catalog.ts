import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Category, OptionGroup, ProductDetail, ProductImage, ProductSummary } from "@/lib/data/types";
import { photoSrc } from "@/lib/cloudinary";
import { stockStatus } from "@/lib/stock";

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
  stock?: number | null;
  description?: string | null;
  material?: string | null;
  tags?: string[];
  rating_avg?: number | null;
  rating_count?: number | null;
  sold_count?: number | null;
  category: { name: string; slug: string } | null;
  images: (Omit<ProductImage, "width" | "height" | "publicId"> & {
    width?: number | null;
    height?: number | null;
    cloudinary_public_id?: string | null;
    sort: number;
  })[];
  groups?: { id: number; heading?: string; sizes?: string[]; colours?: string[]; sort?: number }[];
};

const BASE_COLUMNS = "id, slug, name, price, compare_at_price, is_featured";
const STATS = "rating_avg, rating_count, sold_count";

/**
 * Some columns and tables come from later migrations (ratings and sold counts, photo sizes, Cloudinary ids, one
 * stock number per product, variant groups). Until a migration has been run on the database the shop must keep
 * working, so the queries leave those parts out. A missing one is re-checked at most every 30 seconds.
 */
const probes = new Map<string, { ok: boolean; at: number }>();
async function available(key: string, table: "products" | "product_images" | "product_option_groups", column: string): Promise<boolean> {
  const hit = probes.get(key);
  if (hit && (hit.ok || Date.now() - hit.at < 30_000)) return hit.ok;
  const { error } = await createPublicClient().from(table).select(column).limit(1);
  probes.set(key, { ok: !error, at: Date.now() });
  return !error;
}
export const cloudAvailable = () => available("photo-cloudinary", "product_images", "cloudinary_public_id");

/** Which optional parts of the database exist. */
type Columns = { stats: boolean; stock: boolean; groups: boolean; sizes: boolean; cloud: boolean };
const columns = async (): Promise<Columns> => {
  const [stats, stock, groups, sizes, cloud] = await Promise.all([
    available("stats", "products", "sold_count"),
    available("stock", "products", "stock"),
    available("groups", "product_option_groups", "heading"),
    available("photo-sizes", "product_images", "width"),
    cloudAvailable(),
  ]);
  return { stats, stock, groups, sizes, cloud };
};

const summarySelect = (inner: boolean, c: Columns, full = false) =>
  `${BASE_COLUMNS}${c.stats ? `, ${STATS}` : ""}${c.stock ? ", stock" : ""}, category:categories${inner ? "!inner" : ""}(name, slug), ` +
  `images:product_images(url, alt, sort, blur_data_url${c.sizes ? ", width, height" : ""}${c.cloud ? ", cloudinary_public_id" : ""})` +
  // Cards only need to know whether there are groups; the product page needs them in full.
  `${c.groups ? `, groups:product_option_groups(${full ? "id, heading, sizes, colours, sort" : "id"})` : ""}`;
const detailSelect = (c: Columns) => `${summarySelect(false, c, true)}, description, material, tags`;

function toSummary(r: RawProduct): ProductSummary {
  const images = [...r.images]
    .sort((a, b) => a.sort - b.sort)
    .map(({ url, alt, blur_data_url, width, height, cloudinary_public_id }) => ({
      // A photo on Cloudinary is served from there; the saved `url` is only the fallback.
      url: photoSrc({ url, cloudinary_public_id }),
      publicId: cloudinary_public_id ?? null,
      alt,
      blur_data_url,
      width: width ?? null,
      height: height ?? null,
    }));
  const stock = Math.max(0, r.stock ?? 0);
  const status = stockStatus(stock);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    price: r.price,
    compareAtPrice: r.compare_at_price,
    isFeatured: r.is_featured,
    category: r.category,
    images,
    stock,
    inStock: status !== "out",
    lowStock: status === "low",
    rating: Number(r.rating_avg ?? 0),
    ratingCount: r.rating_count ?? 0,
    soldCount: r.sold_count ?? 0,
    // A product with no variant groups needs no choice, so cards can add it in one tap.
    quickAdd: (r.groups ?? []).length === 0 ? { stock } : null,
  };
}

function toGroups(r: RawProduct): OptionGroup[] {
  return [...(r.groups ?? [])]
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id)
    .map((g) => ({ id: g.id, heading: g.heading ?? "", sizes: g.sizes ?? [], colours: g.colours ?? [] }));
}

function toDetail(r: RawProduct): ProductDetail {
  return {
    ...toSummary(r),
    description: r.description ?? null,
    material: r.material ?? null,
    tags: r.tags ?? [],
    groups: toGroups(r),
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

    const cols = await columns();
    let q = supabase.from("products").select(summarySelect(!!query.category, cols), { count: "exact" });

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
  ["products-v6"],
  { tags: ["catalog"], revalidate: REVALIDATE },
);

export const getProduct = unstable_cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.from("products").select(detailSelect(await columns())).eq("slug", slug).maybeSingle();
    if (error) throw new Error(`getProduct: ${error.message}`);
    return data ? toDetail(data as unknown as RawProduct) : null;
  },
  ["product-v8"],
  { tags: ["catalog"], revalidate: REVALIDATE },
);

export const getRelatedProducts = unstable_cache(
  async (categorySlug: string | null, excludeId: number, limit = 4): Promise<ProductSummary[]> => {
    const supabase = createPublicClient();
    let q = supabase
      .from("products")
      .select(summarySelect(!!categorySlug, await columns()))
      .neq("id", excludeId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (categorySlug) q = q.eq("categories.slug", categorySlug);
    const { data, error } = await q;
    if (error) throw new Error(`getRelatedProducts: ${error.message}`);
    return (data as unknown as RawProduct[]).map(toSummary);
  },
  ["related-v6"],
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
    const { data, error: e2 } = await supabase.from("products").select(summarySelect(false, await columns())).in("id", ids);
    if (e2) throw new Error(`searchProducts: ${e2.message}`);

    const byId = new Map((data as unknown as RawProduct[]).map((p) => [p.id, toSummary(p)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },
  ["search-v6"],
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
