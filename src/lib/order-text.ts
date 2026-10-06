import { formatPKR } from "@/lib/utils";

/**
 * How an order reads in plain text: WhatsApp messages and the plain-text part of emails.
 * Every line says how many pieces, what each costs and the line total, so the arithmetic is clear:
 *   - Ring, Gold, Size 4: 3 x Rs. 1,450 = Rs. 4,350
 */

export type OrderLine = {
  name: string;
  variant_name: string | null;
  qty: number;
  unit_price: number;
  is_gift: boolean;
};

export type OrderBreakdown = {
  items: OrderLine[];
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  shipping_fee: number;
  total: number;
};

/** The variant label worth showing, or an empty string for a plain "Standard" product. */
export const shownVariant = (variant: string | null) => (variant && variant !== "Standard" ? variant : "");

export const piecesLabel = (n: number) => `${n} ${n === 1 ? "piece" : "pieces"}`;

/** Pieces bought, not counting the free gift. */
export const piecesIn = (items: OrderLine[]) => items.filter((i) => !i.is_gift).reduce((n, i) => n + i.qty, 0);

/** "- Gold, Size 4: 3 x Rs. 1,450 = Rs. 4,350". With a single piece there is nothing to multiply. */
export function quantityLine(label: string, qty: number, unitPrice: number): string {
  const each = formatPKR(unitPrice);
  return qty > 1 ? `- ${label}: ${qty} x ${each} = ${formatPKR(unitPrice * qty)}` : `- ${label}: 1 x ${each}`;
}

export function orderLineText(i: OrderLine): string {
  const variant = shownVariant(i.variant_name);
  const label = `${i.name}${variant ? `, ${variant}` : ""}`;
  return i.is_gift ? `- ${label}: free gift` : quantityLine(label, i.qty, i.unit_price);
}

type MessageOrder = OrderBreakdown & {
  order_number: string;
  customer_name: string;
  address: string;
  city: string;
  province: string;
};

/** What the customer sends the shop on WhatsApp to confirm a new order. */
export function confirmOrderMessage(o: MessageOrder, paymentLabel: string): string {
  return [
    `Hello Glance of Gold, I have placed order ${o.order_number}.`,
    "",
    ...orderBreakdownLines(o, paymentLabel),
    "",
    `Name: ${o.customer_name}`,
    `Address: ${o.address}, ${o.city}, ${o.province}`,
    "",
    "Please confirm my order.",
  ].join("\n");
}

/** What the shop sends a customer on WhatsApp about their order, with the items and totals to check. */
export function messageToCustomer(o: MessageOrder, paymentLabel: string): string {
  return [
    `Hello ${o.customer_name}, this is Glance of Gold regarding your order ${o.order_number}.`,
    "",
    ...orderBreakdownLines(o, paymentLabel),
    "",
    `Delivery address: ${o.address}, ${o.city}, ${o.province}`,
  ].join("\n");
}

/** The items and the totals, one line each, ready to drop into a message. */
export function orderBreakdownLines(o: OrderBreakdown, paymentLabel: string): string[] {
  return [
    `Items (${piecesLabel(piecesIn(o.items))}):`,
    ...o.items.map(orderLineText),
    "",
    `Subtotal: ${formatPKR(o.subtotal)}`,
    ...(o.discount > 0 ? [`Discount${o.coupon_code ? ` (${o.coupon_code})` : ""}: -${formatPKR(o.discount)}`] : []),
    `Delivery: ${o.shipping_fee === 0 ? "Free" : formatPKR(o.shipping_fee)}`,
    `Total: ${formatPKR(o.total)} (${paymentLabel})`,
  ];
}
