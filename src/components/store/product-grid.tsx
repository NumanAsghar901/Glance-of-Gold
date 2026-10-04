import { ProductCard } from "@/components/store/product-card";
import type { ProductSummary } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function ProductGrid({
  products,
  priorityCount = 0,
  className,
}: {
  products: ProductSummary[];
  /** Number of leading cards whose images should load eagerly (above the fold). */
  priorityCount?: number;
  className?: string;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <li key={p.id} className={i < priorityCount ? undefined : "reveal"}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
