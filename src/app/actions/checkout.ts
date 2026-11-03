"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { sendOrderEmails } from "@/lib/email/send-order";
import { readMetaContext, sendMetaPurchase } from "@/lib/meta-server";
import { describeOrderError } from "@/lib/order-errors";
import { normalizePhone } from "@/lib/pakistan";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";
import { cartPayloadSchema, checkoutSchema } from "@/lib/validators";

export type CheckoutState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Submitted values, echoed back so React's form reset does not wipe what the customer typed. */
  values?: Record<string, string>;
};

const TEXT_FIELDS = ["name", "phone", "email", "province", "city", "address", "landmark", "notes"] as const;

/** Marks the customer's saved checkout (if any) as recovered. Never throws: it must not affect the order. */
async function markCheckoutRecovered(supabase: ReturnType<typeof createServiceClient>, phone: string, orderId: number) {
  try {
    await supabase
      .from("abandoned_checkouts")
      .update({ status: "recovered", order_id: orderId, updated_at: new Date().toISOString() })
      .eq("phone", phone)
      .in("status", ["open", "contacted"]);
  } catch (err) {
    console.error("[checkout-draft] could not mark recovered:", err);
  }
}

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const values = Object.fromEntries(TEXT_FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));
  const fail = (error: string, fieldErrors?: Record<string, string>): CheckoutState => ({
    error,
    fieldErrors,
    values,
  });

  // Honeypot: real people never fill this hidden field.
  if (formData.get("website")) return fail("We could not place your order. Please try again.");

  const parsed = checkoutSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    province: formData.get("province"),
    city: formData.get("city"),
    address: formData.get("address"),
    landmark: formData.get("landmark") || undefined,
    notes: formData.get("notes") || undefined,
    paymentMethod: formData.get("paymentMethod"),
    submissionId: formData.get("submissionId"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return fail("Please check the highlighted fields.", fieldErrors);
  }

  let cartJson: unknown;
  try {
    cartJson = JSON.parse(String(formData.get("cart") ?? ""));
  } catch {
    return fail("Your bag could not be read. Please go back to your bag and try again.");
  }
  const cart = cartPayloadSchema.safeParse(cartJson);
  if (!cart.success) return fail(cart.error.issues[0]?.message ?? "Your bag is empty.");

  // Only real order attempts count toward the limit, not typos in the form.
  if (!(await rateLimit("order", 8, 10 * 60_000))) {
    return fail("Too many orders from this connection. Please wait a few minutes or order on WhatsApp.");
  }

  const input = parsed.data;
  const supabase = createServiceClient();

  // Both checks are independent, so they share one round trip to the database.
  const [{ data: existing }, accounts] = await Promise.all([
    // Double-submit guard: the browser generates one submissionId per checkout attempt.
    supabase.from("orders").select("access_token").eq("meta_event_id", input.submissionId).maybeSingle(),
    // Manual transfer methods are only offered once the owner has set up an account for them.
    input.paymentMethod === "cod"
      ? null
      : supabase
          .from("payment_accounts")
          .select("id", { count: "exact", head: true })
          .eq("method", input.paymentMethod)
          .eq("is_active", true),
  ]);
  if (existing) redirect(`/order/${existing.access_token}`);
  if (accounts && !accounts.count) return fail("That payment method is not available right now. Please choose another.");

  const { data, error } = await supabase.rpc("create_order", {
    payload: {
      customer: { name: input.name, phone: input.phone, email: input.email ?? "" },
      address: {
        province: input.province,
        city: input.city,
        line: input.address,
        landmark: input.landmark ?? "",
      },
      notes: input.notes ?? "",
      payment_method: input.paymentMethod,
      coupon_code: cart.data.couponCode ?? "",
      gift_product_id: cart.data.giftProductId ?? null,
      meta_event_id: input.submissionId,
      // Each line is a product with the group, size and colour chosen; the database checks them against the product.
      items: cart.data.items.map((i) => ({
        product_id: i.productId,
        qty: i.qty,
        options: i.options ?? (i.group ? [{ group: i.group, size: i.size ?? null, colour: i.colour ?? null }] : null),
        group: i.group ?? null,
        size: i.size ?? null,
        colour: i.colour ?? null,
      })),
    },
  });

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    // Postgres wraps our "CODE:detail" in the error message.
    return fail(describeOrderError(error?.message ?? ""));
  }

  const order = data as { id: number; access_token: string; total: number; meta_event_id: string };
  const metaCtx = await readMetaContext();

  after(async () => {
    await Promise.all([
      // The details saved while this customer was typing are no longer an abandoned checkout.
      markCheckoutRecovered(supabase, normalizePhone(input.phone) ?? input.phone, order.id),
      sendOrderEmails(order.id),
      sendMetaPurchase(
        {
          eventId: order.meta_event_id,
          value: order.total,
          contentIds: [...new Set(cart.data.items.map((i) => String(i.productId)))],
          phone: input.phone,
          email: input.email,
          name: input.name,
          city: input.city,
        },
        metaCtx,
      ),
    ]);
  });

  redirect(`/order/${order.access_token}`);
}
