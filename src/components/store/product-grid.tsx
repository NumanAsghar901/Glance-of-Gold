import { ProductCard } from "@/components/store/product-card";
import type { ProductSummary } from "@/lib/data/types";
import { commonRatio } from "@/lib/image-ratio";
import { cn } from "@/lib/utils";

export function ProductGrid({
  products,
  priorityCount = 0,
  showAdd = true,
  className,
}: {
  products: ProductSummary[];
  /** Number of leading cards whose images should load eagerly (above the fold). */
  priorityCount?: number;
  /** False leaves out the Add to cart bar on every card. */
  showAdd?: boolean;
  className?: string;
}) {
  const ratio = commonRatio(products.map((p) => p.images[0]));
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <li key={p.id} className={i < priorityCount ? undefined : "reveal"}>
          <ProductCard product={p} ratio={ratio} showAdd={showAdd} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
