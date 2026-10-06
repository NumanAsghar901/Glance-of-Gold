"use client";

import { Check, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getQuickView } from "@/app/actions/catalog";
import { WishlistButton } from "@/components/store/card-actions";
import { useVariantSelection } from "@/components/store/use-variant-selection";
import { choiceNoun, SelectionPrice, VariantPicker } from "@/components/store/variant-picker";
import { Button } from "@/components/ui/button";
import { StockTag } from "@/components/ui/stock-tag";
import { piecesLabel } from "@/lib/order-text";
import type { ProductDetail } from "@/lib/data/types";
import { quickView, useQuickView } from "@/lib/quick-view-store";
import { cn } from "@/lib/utils";

type Loaded = { slug: string; product: ProductDetail | null };

export function QuickViewDialog() {
  const slug = useQuickView();
  const ref = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (slug && !dlg.open) dlg.showModal();
    if (!slug && dlg.open) dlg.close();
  }, [slug]);

  useEffect(() => {
    if (!slug || loaded?.slug === slug) return;
    let cancelled = false;
    getQuickView(slug)
      .then((product) => !cancelled && setLoaded({ slug, product }))
      .catch(() => !cancelled && setLoaded({ slug, product: null }));
    return () => {
      cancelled = true;
    };
  }, [slug, loaded?.slug]);

  const loading = !!slug && loaded?.slug !== slug;
  const product = loaded?.slug === slug ? loaded.product : null;

  return (
    <dialog
      ref={ref}
      aria-label="Quick view"
      onClose={quickView.close}
      onClick={(e) => {
        if (e.target === ref.current) quickView.close();
      }}
      className="quick-view m-auto max-h-[92dvh] w-[min(58rem,94vw)] overflow-y-auto overflow-x-hidden bg-background p-0 text-foreground"
      data-lenis-prevent
    >
      <button
        type="button"
        onClick={quickView.close}
        aria-label="Close quick view"
        className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-surface/90 transition-colors duration-200 hover:bg-sand"
      >
        <X className="size-5" strokeWidth={1.5} />
      </button>

      {slug && loading && (
        <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8" aria-busy="true">
          <div className="skeleton aspect-[4/5]" />
          <div className="space-y-4 py-4">
            <div className="skeleton h-10 w-3/4" />
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-14 w-full" />
          </div>
        </div>
      )}

      {slug && !loading && !product && (
        <div className="grid min-h-64 place-content-center gap-4 p-8 text-center">
          <p className="font-heading text-2xl">This piece is no longer available</p>
          <Button href="/shop" onClick={quickView.close}>
            Browse the collection
          </Button>
        </div>
      )}

      {product && <QuickViewBody key={product.id} product={product} />}
    </dialog>
  );
}

function QuickViewBody({ product }: { product: ProductDetail }) {
  const sel = useVariantSelection(product);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const count = sel.pieces;
  const needsChoice = sel.hasChoice && count === 0;
  const image = product.images[imageIndex];

  function add() {
    if (sel.add() === 0) return;
    setAdded(true);
    window.setTimeout(() => quickView.close(), 350);
  }

  return (
    <div className="grid md:grid-cols-2">
      <div className="min-w-0 bg-sand">
        <div className="relative aspect-[4/5]">
          {image && (
            <Image
              key={image.url}
              src={image.url}
              alt={image.alt || product.name}
              fill
              sizes="(min-width: 768px) 28rem, 94vw"
              quality={85}
              className="object-cover"
            />
          )}
        </div>
        {product.images.length > 1 && (
          <ul className="flex gap-2 p-3">
            {product.images.slice(0, 5).map((img, i) => (
              <li key={img.url}>
                <button
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === imageIndex}
                  className={cn(
                    "relative block h-16 w-12 overflow-hidden bg-surface transition-opacity duration-200",
                    i === imageIndex ? "ring-1 ring-gold" : "opacity-60 hover:opacity-100",
                  )}
                >
                  <Image src={img.url} alt="" fill sizes="48px" quality={60} className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-w-0 flex-col p-5 sm:p-6 md:p-8">
        {product.category && <p className="text-sm text-muted-foreground">{product.category.name}</p>}
        <h2 className="mt-1 pr-10 font-heading text-4xl leading-tight">{product.name}</h2>
        <SelectionPrice product={product} sel={sel} className="mt-3 text-lg" />
        <StockTag inStock={product.inStock} lowStock={product.lowStock} className="mt-3 inline-block self-start" />

        {product.description && (
          <p className="mt-5 line-clamp-4 text-[0.9375rem] leading-relaxed text-muted-foreground">{product.description}</p>
        )}

        <div className="mt-6">
          <VariantPicker product={product} sel={sel} idPrefix="qv" />
        </div>

        <div className="mt-8 flex gap-3">
          <Button size="lg" onClick={add} disabled={sel.soldOut || needsChoice || !sel.canAdd || added} className="flex-1">
            {sel.soldOut ? (
              "Out of stock"
            ) : needsChoice ? (
              `Select ${choiceNoun(sel)}`
            ) : added ? (
              <>
                <Check /> Added to cart
              </>
            ) : (
              <>
                <ShoppingBag /> {count > 1 ? `Add ${piecesLabel(count)} to cart` : "Add to cart"}
              </>
            )}
          </Button>
          <WishlistButton slug={product.slug} name={product.name} className="size-14 border border-border bg-surface" />
        </div>

        <Link href={`/product/${product.slug}`} onClick={quickView.close} className="link-draw mt-6 self-start text-[0.9375rem]">
          View full details
        </Link>
      </div>
    </div>
  );
}
