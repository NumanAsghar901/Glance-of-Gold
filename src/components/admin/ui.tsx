import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Server-safe building blocks for the admin panel. Same tokens as the storefront, denser layout. */

export const inputCls =
  "h-11 w-full border border-border bg-surface px-3 text-base transition-colors duration-200 placeholder:text-muted-foreground hover:border-gold focus-visible:border-gold sm:text-sm disabled:opacity-60";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        <h1 className="font-heading text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  children,
  className,
  actions,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn("min-w-0 border border-border bg-surface p-4 sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {title && <h2 className="font-heading text-2xl">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, "h-auto py-2.5", props.className)} />;
}

/** Remounts when the saved value changes, because React cannot update a select's default after mount. */
export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select key={String(props.defaultValue ?? "")} {...props} className={cn(inputCls, props.className)}>
      {children}
    </select>
  );
}

export function Check({
  name,
  label,
  defaultChecked,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 accent-[var(--gold)]"
      />
      <span>
        {label}
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-xs",
        tone === "good" && "bg-[#e3eddc] text-[#3d5a2c]",
        tone === "warn" && "bg-blush text-foreground",
        tone === "bad" && "bg-danger/10 text-danger",
        tone === "neutral" && "bg-sand text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto border border-border bg-surface">{children}</div>;
}

export const th = "whitespace-nowrap border-b border-border px-4 py-3 text-left text-xs font-medium text-muted-foreground";
export const td = "border-b border-border px-4 py-3 align-middle text-sm last:border-b-0";

/** Previous / Next links with full-size tap targets. `hrefFor` builds the link for a page number. */
export function Pager({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;
  const link = "link-draw inline-flex min-h-11 items-center";
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link prefetch={false} href={hrefFor(page - 1)} className={link} rel="prev">
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link prefetch={false} href={hrefFor(page + 1)} className={link} rel="next">
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">{children}</p>;
}

export const orderTone = (s: string) =>
  s === "delivered" ? "good" : s === "pending" ? "warn" : s === "cancelled" || s === "returned" ? "bad" : "neutral";

export const paymentTone = (s: string) =>
  s === "paid" ? "good" : s === "awaiting_verification" ? "warn" : s === "failed" || s === "refunded" ? "bad" : "neutral";
