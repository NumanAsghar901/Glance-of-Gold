"use server";

import { z } from "zod";
import { getProduct, getProducts } from "@/lib/data/catalog";
import type { ProductDetail, ProductSummary } from "@/lib/data/types";

const slugSchema = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80);

/** Full product details for the quick-view dialog. Uses the same cached read as the product page. */
export async function getQuickView(slug: string): Promise<ProductDetail | null> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return null;
  return getProduct(parsed.data);
}

/** Wishlist: fresh product cards for a list of slugs, in the order given. */
export async function getProductsBySlugs(slugs: string[]): Promise<ProductSummary[]> {
  const list = z.array(slugSchema).max(100).safeParse(slugs);
  if (!list.success || list.data.length === 0) return [];

  // The catalogue is small, so one cached page of everything is cheaper than many filtered queries.
  // It only holds active products, so slugs that no longer exist simply drop out.
  const all = await getProducts({ pageSize: 100 });
  const bySlug = new Map(all.items.map((p) => [p.slug, p]));
  return list.data.flatMap((s) => bySlug.get(s) ?? []);
}
