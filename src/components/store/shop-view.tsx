import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ProductGrid } from "@/components/store/product-grid";
import { SortSelect } from "@/components/store/sort-select";
import { Button } from "@/components/ui/button";
import { getCategories, getProducts } from "@/lib/data/catalog";
import {
  PRICE_RANGES,
  SORTS,
  shopHref,
  toProductQuery,
  type ShopParams,
} from "@/lib/shop-params";
import { cn } from "@/lib/utils";

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-10 shrink-0 items-center border px-4 text-[0.8125rem] transition-[background-color,border-color,color,transform] duration-200 ease-(--ease-out) active:scale-[0.97]",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-surface hover:border-gold hover:bg-sand",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Shared by /shop (category via ?category=) and /collections/[slug] (category fixed by the path).
 */
export async function ShopView({
  basePath,
  params,
  categorySlug,
  title,
  description,
}: {
  basePath: string;
  params: ShopParams;
  categorySlug?: string;
  title: string;
  description?: string | null;
}) {
  const query = toProductQuery(params, categorySlug);
  const [{ items, total, page, pageCount }, categories] = await Promise.all([
    getProducts(query),
    getCategories(),
  ]);

  const activeCategory = categorySlug ?? params.category;
  const sort = query.sort ?? "newest";
  // On /shop the category is a query param; on /collections/x it is part of the path.
  const categoryHref = (slug?: string) =>
    categorySlug
      ? slug
        ? `/collections/${slug}${params.sort && params.sort !== "newest" ? `?sort=${params.sort}` : ""}`
        : shopHref("/shop", { sort: params.sort, price: params.price }, {})
      : shopHref(basePath, params, { category: slug });
  const hrefsBySort = Object.fromEntries(
    SORTS.map((s) => [s.value, shopHref(basePath, params, { sort: s.value })]),
  );

  return (
    <div className="wrap py-10 lg:py-16">
      <header className="text-center">
        <h1 className="text-title">{title}</h1>
        <div className="mx-auto mt-4 h-px w-16 bg-gold" aria-hidden="true" />
        {description && <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground">{description}</p>}
      </header>

      <nav aria-label="Categories" className="-mx-4 mt-10 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
        <ul className="flex gap-2 sm:flex-wrap sm:justify-center">
          <li>
            <Chip href={categoryHref(undefined)} active={!activeCategory}>
              All
            </Chip>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Chip href={categoryHref(c.slug)} active={activeCategory === c.slug}>
                {c.name}
              </Chip>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 flex flex-col gap-4 border-y border-border py-4 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Price" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 [scrollbar-width:none]">
          <ul className="flex items-center gap-2">
            <li className="shrink-0 pr-2 text-sm text-muted-foreground">Price</li>
            {PRICE_RANGES.map((r) => (
              <li key={r.key}>
                <Chip
                  href={shopHref(basePath, params, { price: params.price === r.key ? undefined : r.key })}
                  active={params.price === r.key}
                >
                  {r.label}
                </Chip>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center justify-between gap-4 md:justify-end">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "piece" : "pieces"}
          </p>
          <SortSelect value={sort} hrefs={hrefsBySort} />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-5 py-24 text-center">
          <p className="font-heading text-3xl">No pieces found</p>
          <p className="text-sm text-muted-foreground">Try removing a filter to see more of the collection.</p>
          <Button href={categorySlug ? `/collections/${categorySlug}` : "/shop"} variant="outline">
            Clear filters
          </Button>
        </div>
      ) : (
        <ProductGrid products={items} priorityCount={4} className="mt-10" />
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={shopHref(basePath, params, { page: String(page - 1) })}
              aria-label="Previous page"
              rel="prev"
              className="grid size-11 place-items-center border border-border transition-colors duration-200 hover:border-gold hover:bg-sand"
            >
              <ChevronLeft className="size-4" strokeWidth={1.5} />
            </Link>
          )}
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={shopHref(basePath, params, { page: String(n) })}
              aria-current={n === page ? "page" : undefined}
              aria-label={`Page ${n}`}
              className={cn(
                "grid size-11 place-items-center border text-sm transition-colors duration-200",
                n === page ? "border-foreground bg-foreground text-background" : "border-border hover:border-gold hover:bg-sand",
              )}
            >
              {n}
            </Link>
          ))}
          {page < pageCount && (
            <Link
              href={shopHref(basePath, params, { page: String(page + 1) })}
              aria-label="Next page"
              rel="next"
              className="grid size-11 place-items-center border border-border transition-colors duration-200 hover:border-gold hover:bg-sand"
            >
              <ChevronRight className="size-4" strokeWidth={1.5} />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
