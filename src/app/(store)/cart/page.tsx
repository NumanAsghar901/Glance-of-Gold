import type { Metadata } from "next";
import { CartPageView } from "@/components/cart/cart-page-view";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="wrap py-10 lg:py-16">
      <h1 className="text-title text-center">Your bag</h1>
      <div className="mx-auto mt-4 h-px w-16 bg-gold" aria-hidden="true" />
      <div className="mt-10 lg:mt-14">
        <CartPageView />
      </div>
    </div>
  );
}
