import { cn } from "@/lib/utils";

/**
 * "Out of stock" at 0 pieces, "Low stock" when 10 or fewer are left, nothing otherwise.
 * The words carry the meaning, so it never relies on colour alone.
 */
export function StockTag({ inStock, lowStock, className }: { inStock: boolean; lowStock: boolean; className?: string }) {
  if (!inStock) {
    return <span className={cn("bg-foreground px-2.5 py-1 text-xs text-background", className)}>Out of stock</span>;
  }
  if (lowStock) {
    return <span className={cn("border border-gold bg-surface px-2.5 py-1 text-xs text-foreground", className)}>Low stock</span>;
  }
  return null;
}
