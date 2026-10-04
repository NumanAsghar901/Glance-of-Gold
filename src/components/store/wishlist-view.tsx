"use client";

import { Heart } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getProductsBySlugs } from "@/app/actions/catalog";
import { GridSkeleton } from "@/components/store/grid-skeleton";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import type { ProductSummary } from "@/lib/data/types";
import { useWishlist } from "@/lib/wishlist-store";

const noop = () => () => {};

export function WishlistView() {
  const slugs = useWishlist();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [items, setItems] = useState<ProductSummary[] | null>(null);

  // Fetch only when a saved slug has not been loaded yet. Removing an item just hides it.
  const missing = slugs.some((s) => !items?.some((i) => i.slug === s));
  const key = slugs.join(",");
  useEffect(() => {
    if (!missing) return;
    let cancelled = false;
    getProductsBySlugs([...slugs]).then((r) => !cancelled && setItems(r));
    return () => {
      cancelled = true;
    };
    // `key` captures the slug list; `missing` guards the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, missing]);

  if (!hydrated || (slugs.length > 0 && items === null)) return <GridSkeleton count={4} />;

  const shown = slugs.flatMap((s) => items?.find((i) => i.slug === s) ?? []);

  if (shown.length === 0) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-5 py-20 text-center">
        <Heart className="size-12 text-gold" strokeWidth={1} />
        <p className="font-heading text-3xl">Your wishlist is empty</p>
        <p className="text-sm text-muted-foreground">Tap the heart on any piece to save it here for later.</p>
        <Button href="/shop">Browse the collection</Button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
      {shown.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
