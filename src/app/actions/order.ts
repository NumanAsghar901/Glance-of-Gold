"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { sendOwnerNote } from "@/lib/email/send-order";
import { getOrder, type OrderView } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";
import { paymentProofSchema, trackSchema } from "@/lib/validators";

// Payment proof ----------------------------------------------------------------

export type ProofState = { error?: string; ok?: boolean };

const MAX_FILE = 5 * 1024 * 1024;
const FILE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function submitPaymentProof(_prev: ProofState, formData: FormData): Promise<ProofState> {
  if (!(await rateLimit("proof", 6, 10 * 60_000))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const parsed = paymentProofSchema.safeParse({
    token: formData.get("token"),
    transactionId: formData.get("transactionId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, payment_method, payment_status, order_status, total")
    .eq("access_token", parsed.data.token)
    .maybeSingle();

  if (!order || order.payment_method === "cod") return { error: "We could not find this order." };
  if (order.order_status === "cancelled") return { error: "This order has been cancelled." };
  if (order.payment_status === "paid") return { error: "This order is already marked as paid. Thank you!" };

  let screenshotPath: string | null = null;
  const file = formData.get("screenshot");
  if (file instanceof File && file.size > 0) {
    const ext = FILE_TYPES[file.type];
    if (!ext) return { error: "Please upload a JPG, PNG or WebP screenshot." };
    if (file.size > MAX_FILE) return { error: "That image is too large. Please upload one under 5 MB." };

    screenshotPath = `${order.id}/${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(screenshotPath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("[proof] upload failed:", uploadError.message);
      return { error: "We could not upload your screenshot. Please try again, or send it on WhatsApp." };
    }
  }

  const { error: insertError } = await supabase.from("payment_proofs").insert({
    order_id: order.id,
    transaction_id: parsed.data.transactionId,
    screenshot_path: screenshotPath,
  });
  if (insertError) return { error: "We could not save your payment details. Please try again." };

  await supabase.from("orders").update({ payment_status: "awaiting_verification" }).eq("id", order.id);
  await supabase.from("order_events").insert({
    order_id: order.id,
    status: order.order_status,
    note: "Payment proof submitted",
  });

  after(() =>
    sendOwnerNote(
      order.id,
      `Payment proof for ${order.order_number}`,
      `A customer submitted payment details for ${order.order_number} (transaction ID ${parsed.data.transactionId}${screenshotPath ? ", screenshot attached in admin" : ""}). Please verify it in the admin panel.`,
    ),
  );

  revalidatePath(`/order/${parsed.data.token}`);
  return { ok: true };
}

// Order tracking ---------------------------------------------------------------

/** Only what the tracking page shows. No address, email or tokens leave the server. */
export type TrackedOrder = Pick<
  OrderView,
  | "order_number"
  | "order_status"
  | "payment_status"
  | "payment_method"
  | "items"
  | "subtotal"
  | "discount"
  | "shipping_fee"
  | "total"
  | "coupon_code"
  | "events"
  | "courier"
  | "tracking_number"
>;

export type TrackState = { error?: string; order?: TrackedOrder };

export async function trackOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
  if (formData.get("website")) return { error: "We could not find an order with those details." };
  if (!(await rateLimit("track", 10, 5 * 60_000))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const parsed = trackSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };

  const order = await getOrder({ orderNumber: parsed.data.orderNumber, phone: parsed.data.phone });
  // Same message whether the number or the phone is wrong, so orders cannot be probed.
  if (!order) return { error: "We could not find an order with those details." };
  return {
    order: {
      order_number: order.order_number,
      order_status: order.order_status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping_fee: order.shipping_fee,
      total: order.total,
      coupon_code: order.coupon_code,
      events: order.events,
      courier: order.courier,
      tracking_number: order.tracking_number,
    },
  };
}
