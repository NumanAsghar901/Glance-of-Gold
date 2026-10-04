import Link from "next/link";
import type { ReactNode } from "react";

export function PolicyPage({
  title,
  subtitle,
  intro,
  children,
}: {
  title: string;
  subtitle: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="wrap py-10 lg:py-16">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="link-draw">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {title}
          </li>
        </ol>
      </nav>

      <header className="mx-auto mt-10 max-w-2xl text-center">
        <h1 className="text-title">{title}</h1>
        <div className="mx-auto mt-4 h-px w-16 bg-gold" aria-hidden="true" />
        <p className="mt-4 text-muted-foreground">{subtitle}</p>
      </header>

      <div className="mx-auto mt-12 max-w-2xl text-[0.9375rem] leading-relaxed text-foreground/85">
        {intro && <p>{intro}</p>}
        {children}
      </div>
    </div>
  );
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="font-heading text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-foreground/80 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
