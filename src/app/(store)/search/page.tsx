import { Search } from "lucide-react";
import type { Metadata } from "next";
import { ProductGrid } from "@/components/store/product-grid";
import { Button } from "@/components/ui/button";
import { searchProducts } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 60) ?? "";
  const results = q ? await searchProducts(q) : [];

  return (
    <div className="wrap py-10 lg:py-16">
      <header className="text-center">
        <h1 className="text-title">Search</h1>
        <div className="mx-auto mt-4 h-px w-16 bg-gold" aria-hidden="true" />
      </header>

      <form action="/search" role="search" className="mx-auto mt-10 flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">
          Search the collection
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          autoFocus={!q}
          autoComplete="off"
          placeholder="Search necklaces, earrings, rings..."
          className="h-12 min-w-0 flex-1 border border-border bg-surface px-4 text-sm placeholder:text-muted-foreground focus-visible:border-gold"
        />
        <Button type="submit" size="lg" aria-label="Search">
          <Search />
        </Button>
      </form>

      {q && (
        <p className="mt-10 text-center text-sm text-muted-foreground" aria-live="polite">
          {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;
        </p>
      )}

      {q && results.length === 0 && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-5 py-16 text-center">
          <p className="font-heading text-3xl">Nothing found</p>
          <p className="text-sm text-muted-foreground">Check the spelling or browse the full collection.</p>
          <Button href="/shop" variant="outline">
            Browse all jewellery
          </Button>
        </div>
      )}

      {results.length > 0 && <ProductGrid products={results} className="mt-10" />}
    </div>
  );
}
