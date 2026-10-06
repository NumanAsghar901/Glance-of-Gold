import type { Metadata } from "next";
import { addSampleReviews, deleteReview, deleteSampleReviews, setReviewVisible } from "@/app/actions/admin-reviews";
import { ActionButton } from "@/components/admin/action-form";
import { Empty, PageHeader, Pager, Panel, Pill } from "@/components/admin/ui";
import { StarRating } from "@/components/ui/star-rating";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Reviews" };

type Row = {
  id: number;
  author_name: string;
  city: string | null;
  rating: number;
  comment: string;
  is_sample: boolean;
  is_visible: boolean;
  created_at: string;
  product: { name: string } | null;
};

const PAGE_SIZE = 25;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // The list and the sample count are independent, so they run together.
  const [{ data, error, count }, { count: sampleCount }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, author_name, city, rating, comment, is_sample, is_visible, created_at, product:products(name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_sample", true),
  ]);

  // PGRST103 only means the page number is past the last page; anything else is the missing table.
  if (error && error.code !== "PGRST103") {
    return (
      <>
        <PageHeader title="Reviews" />
        <Panel title="One-time database step needed">
          <p className="max-w-2xl text-sm leading-relaxed">
            Reviews, ratings and sold counts need a small database update. In Supabase, open <strong className="font-medium">SQL Editor → New query</strong>,
            paste the whole contents of <code className="bg-sand px-1.5 py-0.5 text-xs">supabase/migrations/20261005000001_reviews_and_sold_counts.sql</code> from the
            project folder, and click <strong className="font-medium">Run</strong>. Then reload this page.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Until then the store works normally and simply hides ratings and reviews.</p>
        </Panel>
      </>
    );
  }

  const reviews = (data ?? []) as unknown as Row[];
  const total = count ?? reviews.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Reviews"
        description={`${total} ${total === 1 ? "review" : "reviews"} in the store. Customers can post reviews on product pages; you can hide or delete any of them here.`}
        actions={
          <>
            <ActionButton action={addSampleReviews} size="md" confirm="Replace the sample reviews with a fresh set (1 to 10 per product) and give products a starting sold count?">
              Add sample reviews
            </ActionButton>
            {(sampleCount ?? 0) > 0 && (
              <ActionButton action={deleteSampleReviews} size="md" confirm="Delete all sample reviews? Real customer reviews are kept.">
                Delete sample reviews
              </ActionButton>
            )}
          </>
        }
      />

      <div className="mb-6 border border-gold bg-sand/50 p-4 text-sm leading-relaxed">
        <strong className="font-medium">Sample reviews are placeholders.</strong> They are made-up text so you can preview the store, and they are marked
        <span className="mx-1"><Pill>Sample</Pill></span> below. Delete them before you launch and show only real customer reviews, because invented reviews
        mislead shoppers.
      </div>

      {reviews.length === 0 ? (
        <Empty>No reviews yet. Use Add sample reviews to preview how they look, or wait for customers to post their own.</Empty>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <StarRating rating={r.rating} size="sm" />
                  <span className="text-sm font-medium">{r.product?.name ?? "Deleted product"}</span>
                  {r.is_sample && <Pill>Sample</Pill>}
                  {!r.is_visible && <Pill tone="warn">Hidden</Pill>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("en-PK", { dateStyle: "medium" })}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{r.comment}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {r.author_name}
                {r.city ? `, ${r.city}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton action={setReviewVisible} fields={{ id: r.id, visible: r.is_visible ? 0 : 1 }}>
                  {r.is_visible ? "Hide from store" : "Show in store"}
                </ActionButton>
                <ActionButton action={deleteReview} fields={{ id: r.id }} confirm="Delete this review?">
                  Delete
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pager page={page} pageCount={pageCount} hrefFor={(n) => `/admin/reviews?page=${n}`} />
    </>
  );
}
