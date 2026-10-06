"use client";

import { Check, MessageCircle, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WishlistButton } from "@/components/store/card-actions";
import { usePurchase } from "@/components/store/purchase-context";
import { useStore } from "@/components/store/store-provider";
import { variantPrice } from "@/components/store/use-variant-selection";
import { choiceNoun, VariantPicker } from "@/components/store/variant-picker";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { piecesLabel, quantityLine } from "@/lib/order-text";
import { site, whatsappLink } from "@/lib/site";
import { cn, formatPKR } from "@/lib/utils";

export function ProductPurchase() {
  const { settings } = useStore();
  const { product, sel } = usePurchase();
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const cta = useRef<HTMLDivElement>(null);

  const count = sel.pieces;
  const needsChoice = sel.hasChoice && count === 0;
  const noun = choiceNoun(sel);
  const total = count > 0 ? sel.total : product.price;

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

  function addToCart() {
    if (sel.add() === 0) return;
    track("AddToCart", {
      content_ids: [String(product.id)],
      content_name: product.name,
      content_type: "product",
      value: sel.total,
      currency: "PKR",
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  const label = sel.soldOut ? (
    "Out of stock"
  ) : needsChoice ? (
    `Select ${noun}`
  ) : added ? (
    <>
      <Check /> Added to cart
    </>
  ) : (
    <>
      <ShoppingBag /> {count > 1 ? `Add ${piecesLabel(count)} to cart` : "Add to cart"}
    </>
  );
  const stickyLabel = sel.soldOut ? "Out of stock" : needsChoice ? `Select ${noun}` : added ? "Added" : count > 1 ? `Add ${count}` : "Add to cart";
  const disabled = sel.soldOut || needsChoice || !sel.canAdd;

  const waText = [
    "Hello Glance of Gold, I would like to order:",
    product.name,
    ...(sel.hasChoice ? sel.lines.map(({ variant: v, qty, label }) => quantityLine(label, qty, variantPrice(product, v))) : []),
    `Total${count > 0 ? ` (${piecesLabel(count)})` : ""}: ${formatPKR(total)}`,
    `${site.url}/product/${product.slug}`,
  ].join("\n");

  return (
    <div>
      <VariantPicker product={product} sel={sel} idPrefix="pp" stockNote={false} />

      <div ref={cta} className="mt-6 flex flex-col gap-3">
        <div className="flex gap-3">
          <Button size="lg" onClick={addToCart} disabled={disabled} className="flex-1" aria-live="polite">
            {label}
          </Button>
          <WishlistButton slug={product.slug} name={product.name} className="size-14 border border-border bg-surface" />
        </div>
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
            {sel.hasChoice && sel.lines.length > 0 && (
              <p className="truncate text-xs text-muted-foreground">
                {sel.lines[0].label}
                {sel.lines.length > 1 && ` and ${sel.lines.length - 1} more`}
              </p>
            )}
            <p className="text-sm">
              {formatPKR(total)}
              {count > 1 && <span className="ml-2 text-muted-foreground">for {piecesLabel(count)}</span>}
            </p>
          </div>
          <Button onClick={addToCart} disabled={disabled} tabIndex={showSticky ? 0 : -1} className="shrink-0">
            {stickyLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
