import Image from "next/image";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { CardActions } from "@/components/store/card-actions";
import { discountPercent, Price } from "@/components/ui/price";
import { StarRating } from "@/components/ui/star-rating";
import { StockTag } from "@/components/ui/stock-tag";
import type { ProductImage, ProductSummary } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const SIZES = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw";

/** Frames that already fit the photo need no filler: within this much of 4:5 the photo just fills the card. */
const CARD_RATIO = 4 / 5;

/**
 * A photo shown whole inside the card frame. When its shape differs from the frame, the leftover space is
 * filled with a tiny copy of the same photo stretched to fit (the browser smooths it into a soft blur, so no
 * filter is needed and it costs a few hundred bytes), instead of a flat band.
 */
function CardPhoto({ photo, priority = false, className }: { photo: ProductImage; priority?: boolean; className?: string }) {
  const fits = !photo.width || !photo.height || Math.abs(photo.width / photo.height - CARD_RATIO) < 0.03;
  return (
    <div className={cn("absolute inset-0", className)}>
      {!fits && <Image src={photo.url} alt="" fill sizes="16px" quality={60} aria-hidden="true" className="object-cover" />}
      <Image
        src={photo.url}
        alt=""
        fill
        sizes={SIZES}
        quality={75}
        priority={priority}
        className={fits ? "object-cover" : "object-contain"}
      />
    </div>
  );
}

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductSummary;
  priority?: boolean;
  className?: string;
}) {
  const [first, second] = product.images;
  const off = discountPercent(product.price, product.compareAtPrice);
  const href = `/product/${product.slug}`;

  return (
    <article className={cn("group", className)}>
      {/* Every card has the same frame, so a row of cards lines up. The whole photo shows inside it. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-sand">
        {/* Image link is decorative for assistive tech; the title below is the real link. */}
        <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0">
          {first ? (
            <>
              <CardPhoto
                photo={first}
                priority={priority}
                className={cn("transition-opacity duration-500 ease-(--ease-out)", second && "group-hover:opacity-0")}
              />
              {second && (
                <CardPhoto
                  photo={second}
                  className="opacity-0 transition-opacity duration-500 ease-(--ease-out) group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="grid h-full place-items-center">
              <LogoMark className="h-14 opacity-60" />
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <StockTag inStock={product.inStock} lowStock={product.lowStock} />
          {product.inStock && off > 0 && (
            <span className="bg-blush px-2.5 py-1 text-xs text-foreground">
              {off}% off
            </span>
          )}
        </div>

        <CardActions product={product} />
      </div>

      <Link href={href} className="mt-4 block space-y-1">
        {product.category && (
          <p className="text-xs text-muted-foreground">
            {product.category.name}
          </p>
        )}
        <h3 className="font-heading text-xl leading-tight transition-colors duration-200 group-hover:text-gold-hover">
          {product.name}
        </h3>
        <Price price={product.price} compareAt={product.compareAtPrice} />
        {(product.ratingCount > 0 || product.soldCount > 0) && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 text-xs text-muted-foreground">
            {product.ratingCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <StarRating rating={product.rating} size="sm" />
                <span>({product.ratingCount})</span>
              </span>
            )}
            {product.soldCount > 0 && <span>{product.soldCount} sold</span>}
          </p>
        )}
      </Link>
    </article>
  );
}
