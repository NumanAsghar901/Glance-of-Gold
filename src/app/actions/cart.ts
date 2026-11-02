"use server";

import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";
import { createServiceClient } from "@/lib/supabase/admin";

const idsSchema = z.array(z.number().int().positive()).max(50);

export type CartSnapshotItem = { productId: number; price: number; stock: number } | null;

/** Current price and stock for the products in the cart, so the cart never shows stale data. RLS hides inactive products. */
export async function getCartSnapshot(productIds: number[]) {
  const ids = idsSchema.safeParse(productIds);
  if (!ids.success || ids.data.length === 0) return {} as Record<number, CartSnapshotItem>;

  const supabase = createPublicClient();
  const { data, error } = await supabase.from("products").select("id, price, stock").in("id", ids.data);
  // If the lookup fails the bag is left as it is: a hiccup must not empty a customer's bag.
  if (error) return {} as Record<number, CartSnapshotItem>;

  const result: Record<number, CartSnapshotItem> = {};
  for (const id of ids.data) result[id] = null;
  for (const row of data ?? []) result[row.id] = { productId: row.id, price: row.price, stock: row.stock };
  return result;
}

export type CouponPreview =
  | { ok: true; code: string; discount: number; freeShipping: boolean }
  | { ok: false; message: string };

const couponSchema = z.object({
  code: z.string().trim().min(3).max(32),
  subtotal: z.number().int().min(0).max(10_000_000),
});

/** Read-only coupon check for the cart. The database re-validates when the order is placed. */
export async function previewCoupon(code: string, subtotal: number): Promise<CouponPreview> {
  const parsed = couponSchema.safeParse({ code, subtotal });
  if (!parsed.success) return { ok: false, message: "Enter a valid coupon code." };
  if (!(await rateLimit("coupon", 12, 60_000))) {
    return { ok: false, message: "Too many attempts. Please wait a minute and try again." };
  }

  const upper = parsed.data.code.toUpperCase();
  const supabase = createServiceClient();
  const { data: c } = await supabase.from("coupons").select("*").eq("code", upper).maybeSingle();

  const now = Date.now();
  if (
    !c ||
    !c.is_active ||
    (c.starts_at && new Date(c.starts_at).getTime() > now) ||
    (c.expires_at && new Date(c.expires_at).getTime() <= now)
  ) {
    return { ok: false, message: "This coupon code is not valid." };
  }
  if (c.usage_limit !== null && c.used_count >= c.usage_limit) {
    return { ok: false, message: "This coupon has reached its usage limit." };
  }
  if (parsed.data.subtotal < c.min_subtotal) {
    return {
      ok: false,
      message: `Spend Rs. ${c.min_subtotal.toLocaleString("en-PK")} or more to use this coupon.`,
    };
  }

  let discount =
    c.discount_type === "percent"
      ? Math.floor((parsed.data.subtotal * c.value) / 100)
      : c.value;
  if (c.max_discount !== null) discount = Math.min(discount, c.max_discount);
  discount = Math.min(discount, parsed.data.subtotal);

  return { ok: true, code: c.code, discount, freeShipping: c.free_shipping };
}
