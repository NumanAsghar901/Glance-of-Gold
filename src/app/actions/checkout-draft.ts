"use server";

import { z } from "zod";
import { normalizePhone } from "@/lib/pakistan";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";

const text = (max: number) => z.string().trim().max(max).optional();

const draftSchema = z.object({
  phone: z.string().trim().max(24),
  name: text(80),
  email: text(120),
  province: text(60),
  city: text(60),
  address: text(300),
  landmark: text(120),
  paymentMethod: z.enum(["cod", "jazzcash", "easypaisa", "bank_transfer"]).optional(),
  items: z
    .array(
      z.object({
        name: z.string().trim().max(120),
        variantName: z.string().trim().max(100),
        qty: z.number().int().min(1).max(50),
        price: z.number().int().min(0).max(10_000_000),
      }),
    )
    .min(1)
    .max(30),
});

/**
 * Keeps what a customer has typed at checkout, once there is a valid phone number to reach them on, so the owner
 * can follow up if the order is never placed. One live row per phone number. The prices are what the customer's
 * bag showed: they are for the owner's reference only and never used to charge anything.
 * Never throws and returns nothing: this runs quietly in the background while the customer types.
 */
export async function saveCheckoutDraft(input: unknown): Promise<void> {
  try {
    const parsed = draftSchema.safeParse(input);
    if (!parsed.success) return;
    const d = parsed.data;
    const phone = normalizePhone(d.phone);
    if (!phone) return;
    if (!(await rateLimit("draft", 60, 10 * 60_000))) return;

    const row = {
      customer_name: d.name || null,
      email: d.email && z.email().safeParse(d.email).success ? d.email : null,
      province: d.province || null,
      city: d.city || null,
      address: d.address || null,
      landmark: d.landmark || null,
      payment_method: d.paymentMethod ?? null,
      items: d.items,
      subtotal: d.items.reduce((n, i) => n + i.price * i.qty, 0),
      updated_at: new Date().toISOString(),
    };

    const supabase = createServiceClient();
    const { data: live } = await supabase
      .from("abandoned_checkouts")
      .select("id")
      .eq("phone", phone)
      .in("status", ["open", "contacted"])
      .maybeSingle();

    if (live) {
      await supabase.from("abandoned_checkouts").update(row).eq("id", live.id);
    } else {
      // A second tab saving at the same moment hits the unique index; that row is already current, so ignore it.
      await supabase.from("abandoned_checkouts").insert({ ...row, phone });
    }
  } catch (err) {
    console.error("[checkout-draft]", err instanceof Error ? err.message : err);
  }
}
