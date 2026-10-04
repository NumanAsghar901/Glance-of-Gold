"use client";

import { Star } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitReview, type ReviewState } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputClass = (error?: string) =>
  cn(
    "w-full border bg-surface px-4 text-base transition-colors duration-200 placeholder:text-muted-foreground hover:border-gold focus-visible:border-gold sm:text-sm",
    error ? "border-danger" : "border-border",
  );

function Send() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Posting..." : "Post review"}
    </Button>
  );
}

export function ReviewForm({ slug }: { slug: string }) {
  const [state, action] = useActionState<ReviewState, FormData>(submitReview, {});
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  if (state.ok) {
    return (
      <p role="status" className="border border-gold bg-sand/60 px-5 py-5 text-[0.9375rem]">
        {state.ok}
      </p>
    );
  }

  const shown = hover || rating || Number(v.rating) || 0;

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating || v.rating || ""} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.error && (
        <p role="alert" className="border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm">Your rating</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="grid size-11 place-items-center transition-transform duration-150 active:scale-90"
            >
              <Star
                className={cn("size-7 transition-colors duration-150", n <= shown ? "fill-gold text-gold" : "fill-transparent text-border")}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
        {fe.rating && <p className="mt-1 text-sm text-danger">{fe.rating}</p>}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="rv-name" className="mb-2 block text-sm">
            Your name
          </label>
          <input id="rv-name" name="name" autoComplete="name" defaultValue={v.name} required className={cn(inputClass(fe.name), "h-12")} />
          {fe.name && <p className="mt-1.5 text-sm text-danger">{fe.name}</p>}
        </div>
        <div>
          <label htmlFor="rv-city" className="mb-2 block text-sm">
            City (optional)
          </label>
          <input id="rv-city" name="city" autoComplete="address-level2" defaultValue={v.city} className={cn(inputClass(fe.city), "h-12")} />
        </div>
      </div>

      <div>
        <label htmlFor="rv-comment" className="mb-2 block text-sm">
          Your review
        </label>
        <textarea id="rv-comment" name="comment" rows={4} defaultValue={v.comment} required className={cn(inputClass(fe.comment), "py-3")} />
        {fe.comment && <p className="mt-1.5 text-sm text-danger">{fe.comment}</p>}
      </div>

      <Send />
    </form>
  );
}
