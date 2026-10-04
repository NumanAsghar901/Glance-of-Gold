import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Review } from "@/lib/data/types";

/**
 * Review reads. If the reviews table has not been created yet (migration not run), every function
 * returns an empty result instead of failing, so the storefront keeps working.
 */

type Row = {
  id: number;
  author_name: string;
  city: string | null;
  rating: number;
  comment: string;
  created_at: string;
  product?: { name: string; slug: string } | null;
};

const toReview = (r: Row): Review => ({
  id: r.id,
  authorName: r.author_name,
  city: r.city,
  rating: r.rating,
  comment: r.comment,
  createdAt: r.created_at,
  product: r.product ?? null,
});

export type ProductReviews = {
  reviews: Review[];
  /** Number of reviews for 1, 2, 3, 4 and 5 stars (index 0 = 1 star). */
  breakdown: [number, number, number, number, number];
};

export const getProductReviews = unstable_cache(
  async (productId: number): Promise<ProductReviews> => {
    const empty: ProductReviews = { reviews: [], breakdown: [0, 0, 0, 0, 0] };
    const { data, error } = await createPublicClient()
      .from("reviews")
      .select("id, author_name, city, rating, comment, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !data) return empty;

    const breakdown: ProductReviews["breakdown"] = [0, 0, 0, 0, 0];
    for (const r of data) breakdown[r.rating - 1] += 1;
    return { reviews: data.slice(0, 30).map(toReview), breakdown };
  },
  ["product-reviews"],
  { tags: ["reviews"], revalidate: 300 },
);

/** A varied selection of good reviews for the home page marquee. */
export const getFeaturedReviews = unstable_cache(
  async (): Promise<Review[]> => {
    const { data, error } = await createPublicClient()
      .from("reviews")
      .select("id, author_name, city, rating, comment, created_at, product:products(name, slug)")
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(80);
    if (error || !data) return [];

    const good = (data as unknown as Row[]).filter((r) => r.comment.length >= 25 && r.product);
    // Show at most two reviews per product so the marquee feels varied, newest first.
    const perProduct = new Map<string, number>();
    const picked: Row[] = [];
    for (const r of good) {
      const key = r.product!.slug;
      const n = perProduct.get(key) ?? 0;
      if (n >= 2) continue;
      perProduct.set(key, n + 1);
      picked.push(r);
      if (picked.length >= 14) break;
    }
    return picked.map(toReview);
  },
  ["featured-reviews"],
  { tags: ["reviews"], revalidate: 300 },
);
