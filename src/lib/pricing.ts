/**
 * Shipping rules shared by the cart UI and server previews. The database
 * function create_order applies the same rules and is the source of truth;
 * these helpers only keep what the customer sees consistent with it.
 */
export type ShippingConfig = { flat: number; freeThreshold: number };

export function shippingFor(
  subtotal: number,
  cfg: ShippingConfig,
  couponFreeShipping = false,
): number {
  if (subtotal <= 0) return 0;
  // The free-delivery threshold uses the subtotal before any coupon discount.
  return subtotal >= cfg.freeThreshold || couponFreeShipping ? 0 : cfg.flat;
}

export function amountToFreeShipping(subtotal: number, cfg: ShippingConfig): number {
  return Math.max(0, cfg.freeThreshold - subtotal);
}

export const MAX_QTY_PER_LINE = 10;
