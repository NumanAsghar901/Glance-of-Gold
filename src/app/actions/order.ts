"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { cloudinaryConfigured, createProofTicket } from "@/lib/cloudinary-server";
import { FOLDERS, ownPublicId, type UploadTicket } from "@/lib/cloudinary";
import { sendOwnerNote } from "@/lib/email/send-order";
import { getOrder, type OrderView } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";
import { paymentProofSchema, trackSchema } from "@/lib/validators";

// Payment proof ----------------------------------------------------------------

export type ProofState = { error?: string; ok?: boolean };

/** Looks up the order a payment proof may be sent for, with the reason when it may not. */
async function orderForProof(token: string) {
  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, payment_method, payment_status, order_status, total")
    .eq("access_token", token)
    .maybeSingle();

  if (!order || order.payment_method === "cod") return { error: "We could not find this order." } as const;
  if (order.order_status === "cancelled") return { error: "This order has been cancelled." } as const;
  if (order.payment_status === "paid") return { error: "This order is already marked as paid. Thank you!" } as const;
  return { order, supabase } as const;
}

/**
 * A one-use ticket for the customer's browser to send a payment screenshot straight to Cloudinary, as a private file
 * that only the admin can open. Only someone holding the order's own link can ask for one, and only for that order.
 */
export async function getProofTicket(token: string): Promise<{ ticket: UploadTicket; publicId: string } | { error: string }> {
  if (!(await rateLimit("proof-ticket", 8, 10 * 60_000))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }
  const parsed = paymentProofSchema.pick({ token: true }).safeParse({ token });
  if (!parsed.success) return { error: "We could not find this order." };
  const found = await orderForProof(parsed.data.token);
  if (found.error) return { error: found.error };
  if (!cloudinaryConfigured()) return { error: "We could not upload screenshots right now. You can send it on WhatsApp instead." };

  const publicId = `${FOLDERS.proof}/${found.order.id}-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  return { ticket: createProofTicket(publicId), publicId };
}

export async function submitPaymentProof(_prev: ProofState, formData: FormData): Promise<ProofState> {
  if (!(await rateLimit("proof", 6, 10 * 60_000))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const parsed = paymentProofSchema.safeParse({
    token: formData.get("token"),
    transactionId: formData.get("transactionId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };

  const found = await orderForProof(parsed.data.token);
  if (found.error) return { error: found.error };
  const { order, supabase } = found;

  // The screenshot was already sent to Cloudinary by the browser. Its id must be one issued for this very order.
  const sent = formData.get("screenshot");
  const screenshotPath = ownPublicId(sent, FOLDERS.proof);
  if (typeof sent === "string" && sent && (!screenshotPath || !screenshotPath.startsWith(`${FOLDERS.proof}/${order.id}-`))) {
    return { error: "We could not read your screenshot. Please add it again, or send it on WhatsApp." };
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
