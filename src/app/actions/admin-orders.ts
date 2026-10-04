"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, type ActionState } from "@/lib/admin/auth";
import { sendOrderEmails } from "@/lib/email/send-order";

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
  return { ok: v.orderStatus === "cancelled" ? "Order cancelled. Stock has been returned." : "Order updated." };
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
