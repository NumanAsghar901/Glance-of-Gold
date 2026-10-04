"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";

export type ReviewState = {
  ok?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(2, "Enter your name").max(60),
  city: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v : undefined)),
  rating: z.coerce.number().int().min(1, "Choose a star rating").max(5, "Choose a star rating"),
  comment: z.string().trim().min(10, "Write at least a short sentence").max(600, "Please keep it under 600 characters"),
});

export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const values = Object.fromEntries(["slug", "name", "city", "rating", "comment"].map((k) => [k, String(formData.get(k) ?? "")]));
  if (formData.get("website")) return { error: "We could not save your review. Please try again.", values };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Please check the highlighted fields.", fieldErrors, values };
  }
  if (!(await rateLimit("review", 3, 10 * 60_000))) {
    return { error: "You have sent a few reviews already. Please wait a few minutes and try again.", values };
  }

  const supabase = createServiceClient();
  const { data: product } = await supabase.from("products").select("id").eq("slug", parsed.data.slug).eq("is_active", true).maybeSingle();
  if (!product) return { error: "We could not find that product.", values };

  const { error } = await supabase.from("reviews").insert({
    product_id: product.id,
    author_name: parsed.data.name,
    city: parsed.data.city ?? null,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
  });
  if (error) {
    console.error("[reviews] insert failed:", error.message);
    return { error: "Reviews are not available yet. Please try again later.", values };
  }

  // The rating summary and sold count change, so refresh the cached product data and review lists.
  updateTag("catalog");
  updateTag("reviews");
  return { ok: "Thank you. Your review is now live." };
}
