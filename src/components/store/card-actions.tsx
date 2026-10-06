"use client";

import { Check, Eye, Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { cartActions } from "@/lib/cart-store";
import type { ProductSummary } from "@/lib/data/types";
import { quickView } from "@/lib/quick-view-store";
import { useWishlist, wishlistActions } from "@/lib/wishlist-store";
import { cn } from "@/lib/utils";

const iconBtn =
  "grid size-10 place-items-center rounded-full bg-surface/95 text-foreground shadow-sm transition-[transform,background-color,color,opacity] duration-300 ease-(--ease-out) hover:bg-gold hover:text-foreground active:scale-90";

/**
 * Smaller look for the heart and eye on product cards. On phones the circle is 32px with a larger
 * invisible tap area (the ::before), so it stays easy to press; from `sm` up it is the normal size.
 */
const compactBtn =
  "relative size-8 before:absolute before:-inset-1.5 before:content-[''] sm:size-10 sm:before:hidden [&_svg]:size-4 sm:[&_svg]:size-[1.125rem]";

/** Heart button, shared by cards, quick view and the product page. */
export function WishlistButton({
  slug,
  name,
  className,
  compact = false,
}: {
  slug: string;
  name: string;
  className?: string;
  compact?: boolean;
}) {
  const saved = useWishlist().includes(slug);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      onClick={() => wishlistActions.toggle(slug)}
      className={cn(iconBtn, compact && compactBtn, className)}
    >
      <Heart
        className={cn("size-[1.125rem] transition-[fill,color] duration-300", saved && "fill-gold-hover text-gold-hover")}
        strokeWidth={1.5}
      />
    </button>
  );
}

/**
 * Overlay inside a product card's image area.
 * Mouse devices: the eye and the add bar appear on hover or keyboard focus.
 * Touch devices have no hover, so they are always visible there.
 */
export function CardActions({ product }: { product: ProductSummary }) {
  const [added, setAdded] = useState(false);
  const qa = product.quickAdd;
  const canAdd = product.inStock;

  const hoverOnly =
    "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100";

  return (
    <>
      <div className="absolute right-2 top-2 flex flex-col gap-2.5 sm:right-3 sm:top-3 sm:gap-2">
        <WishlistButton slug={product.slug} name={product.name} compact />
        <button
          type="button"
          aria-label={`Quick view ${product.name}`}
          onClick={() => quickView.open(product.slug)}
          className={cn(iconBtn, compactBtn, hoverOnly, "[@media(hover:hover)]:translate-x-1 [@media(hover:hover)]:group-hover:translate-x-0 [@media(hover:hover)]:group-focus-within:translate-x-0")}
        >
          <Eye className="size-[1.125rem]" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {canAdd && (
        <button
          type="button"
          onClick={() => {
            if (!qa) return quickView.open(product.slug);
            cartActions.add({
              variantId: qa.variantId,
              productId: product.id,
              slug: product.slug,
              name: product.name,
              variantName: qa.variantName,
              price: product.price,
              image: product.images[0]?.url ?? null,
              stock: qa.stock,
            });
            setAdded(true);
            window.setTimeout(() => setAdded(false), 1500);
          }}
          className={cn(
            "absolute inset-x-0 bottom-0 flex h-11 items-center justify-center gap-2 bg-foreground/92 text-sm font-medium text-background backdrop-blur-0",
            "transition-[transform,background-color,color] duration-300 ease-(--ease-out) hover:bg-gold hover:text-foreground active:brightness-95",
            "[@media(hover:hover)]:translate-y-full [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-focus-within:translate-y-0",
          )}
        >
          {added ? (
            <>
              <Check className="size-4" strokeWidth={1.75} /> Added
            </>
          ) : (
            <>
              <ShoppingBag className="size-4" strokeWidth={1.5} /> {qa ? "Add to bag" : "Choose options"}
            </>
          )}
        </button>
      )}
    </>
  );
}
