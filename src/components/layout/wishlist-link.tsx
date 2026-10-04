"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useWishlist } from "@/lib/wishlist-store";

export function WishlistLink() {
  const count = useWishlist().length;
  return (
    <Link
      href="/wishlist"
      aria-label={count > 0 ? `Wishlist, ${count} ${count === 1 ? "item" : "items"}` : "Wishlist"}
      className="relative hidden size-11 place-items-center rounded-full transition-colors duration-200 hover:bg-sand sm:grid"
    >
      <Heart className="size-5" strokeWidth={1.5} />
      {count > 0 && (
        <span
          key={count}
          className="cart-badge absolute right-1 top-1 grid min-w-[1.125rem] place-items-center rounded-full bg-gold px-1 text-[0.625rem] font-medium leading-[1.125rem] text-foreground"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
