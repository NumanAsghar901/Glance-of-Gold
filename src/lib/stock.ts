/** A product counts as low on stock when 10 or fewer pieces are left, and out of stock at 0. */
export const LOW_STOCK_THRESHOLD = 10;

export type StockStatus = "out" | "low" | "ok";

export function stockStatus(units: number): StockStatus {
  if (units <= 0) return "out";
  return units <= LOW_STOCK_THRESHOLD ? "low" : "ok";
}
