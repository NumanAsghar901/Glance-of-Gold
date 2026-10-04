import Image from "next/image";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { CardActions } from "@/components/store/card-actions";
import { discountPercent, Price } from "@/components/ui/price";
import type { ProductSummary } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const SIZES = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw";

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
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        {/* Image link is decorative for assistive tech; the title below is the real link. */}
        <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0">
          {first ? (
            <>
              <Image
                src={first.url}
                alt=""
                fill
                sizes={SIZES}
                quality={75}
                priority={priority}
                className={cn(
                  "object-cover transition-[opacity,transform] duration-500 ease-(--ease-out)",
                  second ? "group-hover:opacity-0" : "group-hover:scale-[1.03]",
                )}
              />
              {second && (
                <Image
                  src={second.url}
                  alt=""
                  fill
                  sizes={SIZES}
                  quality={75}
                  className="object-cover opacity-0 transition-opacity duration-500 ease-(--ease-out) group-hover:opacity-100"
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
          {!product.inStock && (
            <span className="bg-surface px-2.5 py-1 text-xs text-muted-foreground">
              Sold out
            </span>
          )}
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
      </Link>
    </article>
  );
}
