"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { sampleReviewsFor, sampleSoldCount } from "@/lib/sample-reviews";

const idSchema = z.coerce.number().int().positive();

function refresh() {
  updateTag("catalog");
  updateTag("reviews");
  revalidatePath("/admin/reviews");
}

/**
 * Fills the store with placeholder reviews (1 to 10 per product) and a sold count of 5 to 15 for
 * products that have none yet. Replaces any earlier sample reviews, so it is safe to click twice.
 * These are NOT real customer reviews. They exist so the store can be previewed.
 */
export async function addSampleReviews() {
  const { supabase } = await requireAdmin();

  const { data: products } = await supabase
    .from("products")
    .select("id, sold_count, category:categories(slug)");
  if (!products?.length) return;

  // Fails quietly when the reviews migration has not been run; the page explains what to do.
  const cleared = await supabase.from("reviews").delete().eq("is_sample", true);
  if (cleared.error) return;

  const rows = products.flatMap((p) =>
    sampleReviewsFor({ id: p.id, categorySlug: (p.category as unknown as { slug: string } | null)?.slug ?? null }),
  );
  for (let i = 0; i < rows.length; i += 100) {
    await supabase.from("reviews").insert(rows.slice(i, i + 100));
  }

  // Only products with no sales yet get a starting figure, so real sales are never overwritten.
  await Promise.all(
    products.filter((p) => p.sold_count === 0).map((p) => supabase.from("products").update({ sold_count: sampleSoldCount() }).eq("id", p.id)),
  );
  refresh();
}

/** Removes every sample review. Real reviews and sold counts that came from orders are untouched. */
export async function deleteSampleReviews() {
  const { supabase } = await requireAdmin();
  await supabase.from("reviews").delete().eq("is_sample", true);
  refresh();
}

export async function setReviewVisible(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const visible = formData.get("visible") === "1";
  await supabase.from("reviews").update({ is_visible: visible }).eq("id", id);
  refresh();
}

export async function deleteReview(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("reviews").delete().eq("id", idSchema.parse(formData.get("id")));
  refresh();
}
