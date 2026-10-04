"use client";

import { Check, MessageCircle, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/components/store/store-provider";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { cartActions } from "@/lib/cart-store";
import type { ProductDetail } from "@/lib/data/types";
import { whatsappLink } from "@/lib/site";
import { cn, formatPKR } from "@/lib/utils";

export function ProductPurchase({ product }: { product: ProductDetail }) {
  const { settings } = useStore();
  const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const cta = useRef<HTMLDivElement>(null);

  const variant = product.variants.find((v) => v.id === variantId) ?? firstAvailable;
  const price = variant?.priceOverride ?? product.price;
  const soldOut = !variant || variant.stock < 1;
  const hasChoice = product.variants.length > 1;

  useEffect(() => {
    track("ViewContent", {
      content_ids: [String(product.id)],
      content_name: product.name,
      content_type: "product",
      value: product.price,
      currency: "PKR",
    });
  }, [product.id, product.name, product.price]);

  // Show the sticky buy bar once the main button scrolls out of view (small screens only).
  useEffect(() => {
    const el = cta.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function addToBag() {
    if (!variant || soldOut) return;
    cartActions.add({
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantName: variant.name,
      price,
      image: product.images[0]?.url ?? null,
      stock: variant.stock,
    });
    track("AddToCart", {
      content_ids: [String(product.id)],
      content_name: product.name,
      content_type: "product",
      value: price,
      currency: "PKR",
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  const waText = `Hello Glance of Gold, I would like to order:\n${product.name}${hasChoice && variant ? ` (${variant.name})` : ""}\nPrice: ${formatPKR(price)}\n${typeof window !== "undefined" ? window.location.href : ""}`;

  return (
    <div>
      {hasChoice && (
        <fieldset>
          <legend className="text-sm">
            Select {product.category?.slug === "rings" ? "size" : "option"}
            {variant && <span className="ml-2 text-muted-foreground">{variant.name}</span>}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const out = v.stock < 1;
              const selected = v.id === variantId;
              return (
                <label key={v.id} className={cn("relative", out && "cursor-not-allowed")}>
                  <input
                    type="radio"
                    name="variant"
                    value={v.id}
                    checked={selected}
                    disabled={out}
                    onChange={() => setVariantId(v.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "grid h-11 min-w-12 cursor-pointer place-items-center border px-4 text-sm transition-[border-color,background-color,transform] duration-200 ease-(--ease-out) active:scale-[0.97]",
                      "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
                      selected ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:border-gold",
                      out && "cursor-not-allowed text-muted-foreground line-through opacity-50 hover:border-border",
                    )}
                  >
                    {v.name}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {variant && !soldOut && variant.stock <= 3 && (
        <p className="mt-4 text-sm text-gold-hover">Only {variant.stock} left in stock</p>
      )}

      <div ref={cta} className="mt-6 flex flex-col gap-3">
        <Button size="lg" onClick={addToBag} disabled={soldOut} className="w-full" aria-live="polite">
          {soldOut ? (
            "Sold out"
          ) : added ? (
            <>
              <Check /> Added to bag
            </>
          ) : (
            <>
              <ShoppingBag /> Add to bag
            </>
          )}
        </Button>
        <Button
          href={whatsappLink(waText, settings.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          size="lg"
          className="w-full"
        >
          <MessageCircle /> Order on WhatsApp
        </Button>
      </div>

      {/* Sticky buy bar, small screens only */}
      <div
        aria-hidden={!showSticky}
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-transform duration-300 ease-(--ease-out) lg:hidden",
          showSticky ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-lg leading-tight">{product.name}</p>
            <p className="text-sm">{formatPKR(price)}</p>
          </div>
          <Button onClick={addToBag} disabled={soldOut} tabIndex={showSticky ? 0 : -1} className="shrink-0">
            {soldOut ? "Sold out" : added ? "Added" : "Add to bag"}
          </Button>
        </div>
      </div>
    </div>
  );
}
