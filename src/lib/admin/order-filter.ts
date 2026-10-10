export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type OrderStatusFilter = (typeof ORDER_STATUSES)[number];

/**
 * Reads the status tab and search box of the Orders page. Shared by the list and the Excel
 * export, so the file always holds exactly the orders the admin is looking at.
 */
export function parseOrderFilter(sp: { status?: string; q?: string }) {
  const status: OrderStatusFilter | undefined = ORDER_STATUSES.find((s) => s === sp.status);
  // Keep only characters that are safe inside a PostgREST or() filter.
  const q = (sp.q ?? "").replace(/[^a-zA-Z0-9\s-]/g, "").trim().slice(0, 40);
  return { status, q };
}
