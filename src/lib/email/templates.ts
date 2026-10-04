import { formatPKR } from "@/lib/utils";

/**
 * Order emails. Inline styles and table layout only, since email clients ignore
 * external CSS. Colours mirror the brand tokens in globals.css.
 */
const C = {
  bg: "#FBF8F3",
  surface: "#FFFFFF",
  sand: "#F3ECE1",
  text: "#2A2622",
  muted: "#7A7066",
  gold: "#B8935A",
  goldHover: "#8F6E3B",
};

export type EmailOrder = {
  id: number;
  order_number: string;
  access_token: string;
  customer_name: string;
  phone: string;
  email: string | null;
  province: string;
  city: string;
  address: string;
  landmark: string | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  coupon_code: string | null;
  payment_method: "cod" | "jazzcash" | "easypaisa" | "bank_transfer";
  items: { name: string; variant_name: string | null; qty: number; unit_price: number; is_gift: boolean }[];
};

export const PAYMENT_LABEL: Record<EmailOrder["payment_method"], string> = {
  cod: "Cash on delivery",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank_transfer: "Bank transfer",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function shell(preheader: string, body: string, helpline: string, contactEmail: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Glance of Gold</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:Arial,Helvetica,sans-serif;color:${C.text};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.surface};border:1px solid ${C.gold};">
<tr><td align="center" style="padding:32px 24px 20px;border-bottom:1px solid ${C.gold};">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:6px;text-transform:uppercase;color:${C.text};">Glance of Gold</div>
<div style="font-size:10px;letter-spacing:5px;text-transform:uppercase;color:${C.muted};margin-top:6px;">Jewellery</div>
</td></tr>
<tr><td style="padding:28px 24px;">${body}</td></tr>
<tr><td align="center" style="background:${C.sand};padding:20px 24px;font-size:12px;color:${C.muted};line-height:1.6;">
Questions? Call or WhatsApp ${esc(helpline)}<br>or email <a href="mailto:${esc(contactEmail)}" style="color:${C.goldHover};">${esc(contactEmail)}</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(o: EmailOrder) {
  const rows = o.items
    .map(
      (i) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${C.sand};font-size:14px;">${esc(i.name)}${
        i.variant_name && i.variant_name !== "Standard"
          ? `<br><span style="color:${C.muted};font-size:12px;">${esc(i.variant_name)}</span>`
          : ""
      }${i.is_gift ? `<br><span style="color:${C.goldHover};font-size:12px;">Free gift</span>` : ""}</td>
<td align="center" style="padding:10px 8px;border-bottom:1px solid ${C.sand};font-size:14px;">${i.qty}</td>
<td align="right" style="padding:10px 0;border-bottom:1px solid ${C.sand};font-size:14px;">${i.is_gift ? "Free" : formatPKR(i.unit_price * i.qty)}</td></tr>`,
    )
    .join("");

  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;font-size:${bold ? 16 : 14}px;${bold ? "font-weight:bold;" : `color:${C.muted};`}">${label}</td><td align="right" style="padding:4px 0;font-size:${bold ? 16 : 14}px;${bold ? "font-weight:bold;" : ""}">${value}</td></tr>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};padding-bottom:8px;border-bottom:1px solid ${C.gold};">Item</td>
<td align="center" style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};padding-bottom:8px;border-bottom:1px solid ${C.gold};">Qty</td>
<td align="right" style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};padding-bottom:8px;border-bottom:1px solid ${C.gold};">Price</td></tr>
${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
${line("Subtotal", formatPKR(o.subtotal))}
${o.discount > 0 ? line(`Discount${o.coupon_code ? ` (${esc(o.coupon_code)})` : ""}`, `-${formatPKR(o.discount)}`) : ""}
${line("Delivery", o.shipping_fee === 0 ? "Free" : formatPKR(o.shipping_fee))}
<tr><td colspan="2" style="border-top:1px solid ${C.gold};padding-top:8px;"></td></tr>
${line("Total", formatPKR(o.total), true)}
</table>`;
}

function addressBlock(o: EmailOrder) {
  return `<p style="margin:0;font-size:14px;line-height:1.7;">${esc(o.customer_name)}<br>${esc(o.address)}${
    o.landmark ? `<br>Near ${esc(o.landmark)}` : ""
  }<br>${esc(o.city)}, ${esc(o.province)}<br>${esc(o.phone)}</p>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;"><tr><td style="background:${C.gold};">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.text};text-decoration:none;font-weight:bold;">${label}</a></td></tr></table>`;
}

export function customerEmail(
  o: EmailOrder,
  ctx: { siteUrl: string; helpline: string; contactEmail: string; whatsappUrl: string },
) {
  const transfer = o.payment_method !== "cod";
  const confirmUrl = `${ctx.siteUrl}/order/${o.access_token}`;
  const body = `
<h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:28px;">Thank you, ${esc(o.customer_name.split(" ")[0])}</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:${C.muted};">We have received your order <strong style="color:${C.text};">${esc(o.order_number)}</strong>. ${
    transfer
      ? "Please complete your payment and send us the transaction details, and we will confirm your order."
      : "We will confirm it with you on WhatsApp shortly, then dispatch it with Leopards."
  }</p>
${itemsTable(o)}
<h2 style="margin:28px 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};">Delivering to</h2>
${addressBlock(o)}
<h2 style="margin:24px 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};">Payment</h2>
<p style="margin:0;font-size:14px;">${PAYMENT_LABEL[o.payment_method]}${o.payment_method === "cod" ? ` &mdash; pay ${formatPKR(o.total)} on delivery` : ""}</p>
${button(confirmUrl, transfer ? "Complete payment" : "View your order")}
<p style="margin:20px 0 0;font-size:13px;"><a href="${ctx.whatsappUrl}" style="color:${C.goldHover};">Confirm this order on WhatsApp</a></p>`;
  return {
    subject: `Order ${o.order_number} received | Glance of Gold`,
    html: shell(`Your order ${o.order_number} has been received`, body, ctx.helpline, ctx.contactEmail),
    text: [
      `Thank you, ${o.customer_name}.`,
      `We have received your order ${o.order_number}.`,
      ...o.items.map((i) => `- ${i.name}${i.variant_name && i.variant_name !== "Standard" ? ` (${i.variant_name})` : ""} x${i.qty}${i.is_gift ? " (free gift)" : ""}`),
      `Total: ${formatPKR(o.total)} (${PAYMENT_LABEL[o.payment_method]})`,
      `View your order: ${confirmUrl}`,
      `Helpline: ${ctx.helpline}`,
    ].join("\n"),
  };
}

export function ownerEmail(
  o: EmailOrder,
  ctx: { siteUrl: string; helpline: string; contactEmail: string; whatsappCustomerUrl: string },
) {
  const adminUrl = `${ctx.siteUrl}/admin/orders/${o.id}`;
  const body = `
<h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;">New order ${esc(o.order_number)}</h1>
<p style="margin:0 0 20px;font-size:14px;color:${C.muted};">${PAYMENT_LABEL[o.payment_method]} &middot; ${formatPKR(o.total)}${o.notes ? ` &middot; Note: ${esc(o.notes)}` : ""}</p>
${itemsTable(o)}
<h2 style="margin:28px 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};">Customer</h2>
${addressBlock(o)}${o.email ? `<p style="margin:8px 0 0;font-size:14px;">${esc(o.email)}</p>` : ""}
${button(adminUrl, "Open in admin")}
<p style="margin:20px 0 0;font-size:13px;"><a href="${ctx.whatsappCustomerUrl}" style="color:${C.goldHover};">Message the customer on WhatsApp</a></p>`;
  return {
    subject: `New order ${o.order_number} - ${formatPKR(o.total)} (${PAYMENT_LABEL[o.payment_method]})`,
    html: shell(`New order ${o.order_number}`, body, ctx.helpline, ctx.contactEmail),
    text: [
      `New order ${o.order_number} - ${formatPKR(o.total)} (${PAYMENT_LABEL[o.payment_method]})`,
      `${o.customer_name}, ${o.phone}`,
      `${o.address}, ${o.city}, ${o.province}`,
      ...o.items.map((i) => `- ${i.name} x${i.qty}${i.is_gift ? " (gift)" : ""}`),
      `Admin: ${adminUrl}`,
    ].join("\n"),
  };
}
