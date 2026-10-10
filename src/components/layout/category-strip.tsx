"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Category = { id: number; slug: string; name: string };

const link =
  "relative inline-flex min-h-11 items-center whitespace-nowrap px-3 text-[0.9375rem] transition-colors duration-200 " +
  "after:absolute after:inset-x-3 after:bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-gold " +
  "after:transition-transform after:duration-300 after:ease-(--ease-out) hover:after:scale-x-100";

/**
 * The shop's categories as a row under the header, the same list as the menu. On a phone it
 * scrolls sideways; from `lg` up the header already links to the shop and new arrivals, so
 * only the categories are shown and the row sits centred.
 */
export function CategoryStrip({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const scroller = useRef<HTMLElement>(null);

  // Bring the current category into view when the row is wider than the screen.
  useEffect(() => {
    const row = scroller.current;
    const current = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !current) return;
    row.scrollLeft = current.offsetLeft - (row.clientWidth - current.offsetWidth) / 2;
  }, [pathname]);

  return (
    <nav
      ref={scroller}
      aria-label="Categories"
      className={cn(
        "overflow-x-auto border-b border-border bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        categories.length === 0 && "lg:hidden",
      )}
    >
      <ul className="mx-auto flex w-max min-w-full items-center px-2 sm:px-4 lg:justify-center">
        <li className="lg:hidden">
          <Link href="/shop" className={link}>
            All jewellery
          </Link>
        </li>
        <li className="lg:hidden">
          <Link href="/shop?sort=newest" className={link}>
            New arrivals
          </Link>
        </li>
        {categories.map((c) => {
          const href = `/collections/${c.slug}`;
          const active = pathname === href;
          return (
            <li key={c.id}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(link, active && "after:scale-x-100")}
              >
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
