import type { Metadata } from "next";
import { WishlistView } from "@/components/store/wishlist-view";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default function WishlistPage() {
  return (
    <div className="wrap py-10 lg:py-16">
      <header className="text-center">
        <h1 className="text-title">Your wishlist</h1>
        <div className="mx-auto mt-4 h-px w-16 bg-gold" aria-hidden="true" />
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">The pieces you have saved on this device.</p>
      </header>
      <div className="mt-12">
        <WishlistView />
      </div>
    </div>
  );
}
