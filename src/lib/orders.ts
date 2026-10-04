import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import type { EmailOrder } from "@/lib/email/templates";

/** Server-only order reads. Orders are never public; they are looked up with the service role. */

const ORDER_COLUMNS =
  "id, order_number, access_token, customer_name, phone, email, province, city, address, landmark, notes, subtotal, discount, shipping_fee, total, coupon_code, payment_method, payment_status, order_status, courier, tracking_number, cancel_reason, meta_event_id, created_at";

export type OrderView = EmailOrder & {
  payment_status: "unpaid" | "awaiting_verification" | "paid" | "failed" | "refunded";
  order_status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
  courier: string | null;
  tracking_number: string | null;
  meta_event_id: string;
  created_at: string;
  events: { status: string; note: string | null; created_at: string }[];
  hasProof: boolean;
};

type Where = { token: string } | { orderNumber: string; phone: string } | { id: number };

export async function getOrder(where: Where): Promise<OrderView | null> {
  const supabase = createServiceClient();
  let q = supabase.from("orders").select(ORDER_COLUMNS);
  if ("token" in where) q = q.eq("access_token", where.token);
  else if ("id" in where) q = q.eq("id", where.id);
  else q = q.eq("order_number", where.orderNumber).eq("phone", where.phone);

  const { data: order } = await q.maybeSingle();
  if (!order) return null;

  const [{ data: items }, { data: events }, { count }] = await Promise.all([
    supabase
      .from("order_items")
      .select("name, variant_name, qty, unit_price, is_gift")
      .eq("order_id", order.id)
      .order("id"),
    supabase
      .from("order_events")
      .select("status, note, created_at")
      .eq("order_id", order.id)
      .order("created_at"),
    supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("order_id", order.id),
  ]);

  return {
    ...order,
    items: items ?? [],
    events: events ?? [],
    hasProof: (count ?? 0) > 0,
  };
}
