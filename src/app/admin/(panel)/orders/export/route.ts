import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/admin/auth";
import { parseOrderFilter } from "@/lib/admin/order-filter";
import { PAYMENT_LABEL } from "@/lib/email/templates";
import { shownVariant } from "@/lib/order-text";

/** PostgREST returns at most 1000 rows per request, so the export reads in pages of that size. */
const BATCH = 1000;
const MAX_ORDERS = 5000;

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  awaiting_verification: "Awaiting verification",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

const titleCase = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "12 Oct 2026, 3:45 pm" in Pakistan time. */
const placedAt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

/**
 * Downloads the orders matching the current status tab and search as an Excel sheet with one
 * row per order and the delivery details a courier booking form asks for, so they can be
 * copied or imported instead of typed.
 */
export async function GET(request: Request) {
  const { supabase } = await requireAdmin();
  const params = new URL(request.url).searchParams;
  const { status, q } = parseOrderFilter({
    status: params.get("status") ?? undefined,
    q: params.get("q") ?? undefined,
  });

  const orders = [];
  for (let from = 0; from < MAX_ORDERS; from += BATCH) {
    let query = supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, phone, email, address, landmark, city, province, notes, total, payment_method, payment_status, order_status, created_at, order_items(name, variant_name, qty, is_gift)",
      )
      .order("created_at", { ascending: false })
      .range(from, from + BATCH - 1);
    if (status) query = query.eq("order_status", status);
    if (q) query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,phone.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) return new Response("The export could not be built. Please try again.", { status: 500 });
    orders.push(...data);
    if (data.length < BATCH) break;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Little Luxe Glow";
  const sheet = workbook.addWorksheet("Orders", { views: [{ state: "frozen", ySplit: 1 }] });

  sheet.columns = [
    { header: "Order number", key: "order", width: 16 },
    { header: "Customer name", key: "name", width: 24 },
    { header: "Phone", key: "phone", width: 16, style: { numFmt: "@" } },
    { header: "Address", key: "address", width: 46, style: { alignment: { wrapText: true, vertical: "top" } } },
    { header: "City", key: "city", width: 16 },
    { header: "Province", key: "province", width: 18 },
    { header: "Pieces", key: "pieces", width: 9 },
    { header: "Items", key: "items", width: 44, style: { alignment: { wrapText: true, vertical: "top" } } },
    { header: "Cash to collect (Rs.)", key: "cod", width: 20, style: { numFmt: "#,##0" } },
    { header: "Order total (Rs.)", key: "total", width: 17, style: { numFmt: "#,##0" } },
    { header: "Payment", key: "payment", width: 18 },
    { header: "Payment status", key: "paymentStatus", width: 22 },
    { header: "Order status", key: "orderStatus", width: 14 },
    { header: "Email", key: "email", width: 28 },
    { header: "Customer note", key: "notes", width: 30, style: { alignment: { wrapText: true, vertical: "top" } } },
    { header: "Placed", key: "placed", width: 22 },
  ];

  for (const o of orders) {
    const items = o.order_items ?? [];
    sheet.addRow({
      order: o.order_number,
      name: o.customer_name,
      phone: o.phone,
      address: o.landmark ? `${o.address}, near ${o.landmark}` : o.address,
      city: o.city,
      province: o.province,
      pieces: items.filter((i) => !i.is_gift).reduce((n, i) => n + i.qty, 0),
      items: items
        .map((i) => {
          const variant = shownVariant(i.variant_name);
          const label = `${i.name}${variant ? ` (${variant})` : ""}`;
          return i.is_gift ? `${label}, free gift` : `${label} x ${i.qty}`;
        })
        .join("\n"),
      // Transfer orders are paid before dispatch, so the courier collects nothing on those.
      cod: o.payment_method === "cod" ? o.total : 0,
      total: o.total,
      payment: PAYMENT_LABEL[o.payment_method],
      paymentStatus: PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status,
      orderStatus: titleCase(o.order_status),
      email: o.email ?? "",
      notes: o.notes ?? "",
      placed: placedAt(o.created_at),
    });
  }

  const header = sheet.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF2A2622" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3ECE1" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFB8935A" } } };
  });
  // Keep the filter dropdowns on the header so the sheet can be sorted by city or status.
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const filename = `little-luxe-glow-orders${status ? `-${status}` : ""}-${day}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
