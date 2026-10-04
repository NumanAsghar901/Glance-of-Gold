"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireAdmin, type ActionState } from "@/lib/admin/auth";
import { sendOrderEmails, sendStatusEmail } from "@/lib/email/send-order";
import type { StatusKind } from "@/lib/email/templates";

const idSchema = z.coerce.number().int().positive();

function refresh(id: number) {
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

const updateSchema = z.object({
  id: idSchema,
  orderStatus: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]),
  courier: z.string().trim().max(60),
  trackingNumber: z.string().trim().max(80),
  cancelReason: z.string().trim().max(200),
});

export async function updateOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    orderStatus: formData.get("orderStatus"),
    courier: formData.get("courier") ?? "",
    trackingNumber: formData.get("trackingNumber") ?? "",
    cancelReason: formData.get("cancelReason") ?? "",
  });
  if (!parsed.success) return { error: "Please check the order details." };
  const v = parsed.data;
  const notify = formData.get("notifyCustomer") === "on";

  const { data: before } = await supabase.from("orders").select("order_status, email").eq("id", v.id).maybeSingle();

  const { error } = await supabase
    .from("orders")
    .update({
      order_status: v.orderStatus,
      courier: v.courier || null,
      tracking_number: v.trackingNumber || null,
      cancel_reason: v.orderStatus === "cancelled" ? v.cancelReason || null : null,
    })
    .eq("id", v.id);

  // The database refuses to reopen a cancelled order; surface its message.
  if (error) return { error: error.message };
  refresh(v.id);

  // Tell the customer when the order moves to a new stage (pending is the starting point, never emailed).
  const changed = before && before.order_status !== v.orderStatus && v.orderStatus !== "pending";
  const willEmail = !!(changed && notify && before?.email);
  if (willEmail) {
    after(() => sendStatusEmail(v.id, v.orderStatus as StatusKind));
  }

  const base = v.orderStatus === "cancelled" ? "Order cancelled. Stock has been returned." : "Order updated.";
  if (changed && notify && !before?.email) return { ok: `${base} The customer did not give an email, so no message was sent.` };
  return { ok: willEmail ? `${base} The customer is being emailed.` : base };
}

export async function setPaymentStatus(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const status = z.enum(["paid", "failed", "unpaid", "refunded"]).parse(formData.get("status"));

  await supabase.from("orders").update({ payment_status: status }).eq("id", id);
  if (status === "paid") {
    await supabase
      .from("payment_proofs")
      .update({ verified_by: user.id, verified_at: new Date().toISOString() })
      .eq("order_id", id)
      .is("verified_at", null);
  }
  await supabase.from("order_events").insert({
    order_id: id,
    status: "payment",
    note: status === "paid" ? "Payment verified" : `Payment marked ${status}`,
  });
  refresh(id);

  // A verified transfer deserves a receipt. Cash on delivery orders are paid at the door, so no email there.
  if (status === "paid") {
    const { data: o } = await supabase.from("orders").select("payment_method, email").eq("id", id).maybeSingle();
    if (o?.email && o.payment_method !== "cod") after(() => sendStatusEmail(id, "payment_received"));
  }
}

export async function toggleWhatsappConfirmed(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const confirmed = formData.get("confirmed") === "1";
  await supabase
    .from("orders")
    .update({ whatsapp_confirmed_at: confirmed ? null : new Date().toISOString() })
    .eq("id", id);
  refresh(id);
}

export async function resendOrderEmails(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const only = z.enum(["customer", "owner", "all"]).parse(formData.get("only") ?? "all");
  await sendOrderEmails(id, only === "all" ? undefined : only);
  refresh(id);
}
