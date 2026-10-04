import type { ProductQuery, ProductSort } from "@/lib/data/catalog";

export const PRICE_RANGES = [
  { key: "under-1500", label: "Under Rs. 1,500", max: 1499 },
  { key: "1500-3000", label: "Rs. 1,500 - 3,000", min: 1500, max: 3000 },
  { key: "over-3000", label: "Over Rs. 3,000", min: 3001 },
] as const;

export const SORTS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export type ShopParams = {
  category?: string;
  sort?: string;
  price?: string;
  page?: string;
};

type Raw = Record<string, string | string[] | undefined>;

export function readShopParams(raw: Raw): ShopParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return {
    category: one(raw.category),
    sort: one(raw.sort),
    price: one(raw.price),
    page: one(raw.page),
  };
}

export function toProductQuery(p: ShopParams, categorySlug?: string): ProductQuery {
  const sort = SORTS.some((s) => s.value === p.sort) ? (p.sort as ProductSort) : "newest";
  const range = PRICE_RANGES.find((r) => r.key === p.price);
  const page = Number.parseInt(p.page ?? "1", 10);
  return {
    category: categorySlug ?? p.category,
    sort,
    min: range && "min" in range ? range.min : undefined,
    max: range && "max" in range ? range.max : undefined,
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 200) : 1,
  };
}

/** Build a shop URL from the current params with overrides. Empty/undefined values are dropped. */
export function shopHref(
  basePath: string,
  current: ShopParams,
  overrides: Partial<Record<keyof ShopParams, string | undefined>>,
) {
  const merged: Record<string, string | undefined> = { ...current, ...overrides };
  // Any filter change resets pagination unless page itself is being set.
  if (!("page" in overrides)) delete merged.page;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (!v) continue;
    if (k === "sort" && v === "newest") continue;
    if (k === "page" && v === "1") continue;
    qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}
