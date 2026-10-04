"use client";

import { Check, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getQuickView } from "@/app/actions/catalog";
import { WishlistButton } from "@/components/store/card-actions";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { cartActions } from "@/lib/cart-store";
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
  const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId) ?? firstAvailable;
  const price = variant?.priceOverride ?? product.price;
  const soldOut = !variant || variant.stock < 1;
  const hasChoice = product.variants.length > 1;
  const image = product.images[imageIndex];

  function add() {
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
              quality={75}
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
        <Price price={price} compareAt={variant?.priceOverride ? null : product.compareAtPrice} className="mt-3 text-lg" />

        {product.description && (
          <p className="mt-5 line-clamp-4 text-[0.9375rem] leading-relaxed text-muted-foreground">{product.description}</p>
        )}

        {hasChoice && (
          <fieldset className="mt-6 min-w-0">
            <legend className="text-sm">
              Select option <span className="ml-1 text-muted-foreground">{variant?.name}</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.variants.map((v) => {
                const out = v.stock < 1;
                return (
                  <label key={v.id} className={cn("relative", out && "cursor-not-allowed")}>
                    <input
                      type="radio"
                      name="qv-variant"
                      value={v.id}
                      checked={v.id === variantId}
                      disabled={out}
                      onChange={() => setVariantId(v.id)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "grid h-11 min-w-12 cursor-pointer place-items-center border px-4 text-sm transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
                        v.id === variantId ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:border-gold",
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

        {variant && !soldOut && variant.stock <= 3 && <p className="mt-4 text-sm text-gold-hover">Only {variant.stock} left in stock</p>}

        <div className="mt-8 flex gap-3">
          <Button size="lg" onClick={add} disabled={soldOut || added} className="flex-1">
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
          <WishlistButton slug={product.slug} name={product.name} className="size-14 border border-border bg-surface" />
        </div>

        <Link href={`/product/${product.slug}`} onClick={quickView.close} className="link-draw mt-6 self-start text-[0.9375rem]">
          View full details
        </Link>
      </div>
    </div>
  );
}
