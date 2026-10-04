import { ReviewForm } from "@/components/store/review-form";
import { StarRating } from "@/components/ui/star-rating";
import type { ProductReviews as Data } from "@/lib/data/reviews";
import type { ProductDetail } from "@/lib/data/types";

const dateFmt = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" });

export function ProductReviews({ product, data }: { product: ProductDetail; data: Data }) {
  const total = data.reviews.length > 0 ? data.breakdown.reduce((a, b) => a + b, 0) : 0;

  return (
    <section id="reviews" className="scroll-mt-28 pt-20 lg:pt-28" aria-labelledby="reviews-heading">
      <div className="reveal flex items-end justify-between gap-6 border-b border-border pb-5">
        <h2 id="reviews-heading" className="text-title">
          Customer reviews
        </h2>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          {total > 0 ? (
            <>
              <p className="font-heading text-6xl leading-none">{product.rating.toFixed(1)}</p>
              <StarRating rating={product.rating} size="lg" className="mt-3" />
              <p className="mt-2 text-sm text-muted-foreground">
                Based on {total} {total === 1 ? "review" : "reviews"}
              </p>

              <ul className="mt-6 space-y-2" aria-label="Rating breakdown">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = data.breakdown[n - 1];
                  return (
                    <li key={n} className="flex items-center gap-3 text-sm">
                      <span className="w-12 shrink-0 text-muted-foreground">{n} stars</span>
                      <span className="relative h-1.5 flex-1 overflow-hidden bg-sand" aria-hidden="true">
                        <span className="absolute inset-y-0 left-0 bg-gold" style={{ width: `${(count / total) * 100}%` }} />
                      </span>
                      <span className="w-6 shrink-0 text-right text-muted-foreground">{count}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="max-w-xs text-muted-foreground">No reviews yet. Be the first to share what you think of this piece.</p>
          )}

          <details className="group mt-8">
            <summary className="inline-flex h-12 cursor-pointer list-none items-center border border-gold px-6 text-[0.9375rem] font-medium transition-colors duration-200 hover:bg-gold [&::-webkit-details-marker]:hidden">
              Write a review
            </summary>
            <div className="mt-6 border border-border bg-surface p-5">
              <ReviewForm slug={product.slug} />
            </div>
          </details>
        </div>

        <ul className="divide-y divide-border lg:col-span-8">
          {data.reviews.map((r) => (
            <li key={r.id} className="reveal py-6 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StarRating rating={r.rating} size="sm" />
                <time dateTime={r.createdAt} className="text-sm text-muted-foreground">
                  {dateFmt.format(new Date(r.createdAt))}
                </time>
              </div>
              <p className="mt-3 max-w-prose leading-relaxed">{r.comment}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                {r.authorName}
                {r.city ? `, ${r.city}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
