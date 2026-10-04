"use client";

import { Mail, Menu, MessageCircle, Phone, Search, X } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Logo } from "@/components/brand/logo";
import { helpNav, site, whatsappLink } from "@/lib/site";

type Category = { id: number; slug: string; name: string };

/**
 * The three-line menu. A native <dialog> gives focus trapping, Esc to close and an inert
 * page behind it with no extra JavaScript, which matters on low-end phones.
 */
export function SiteMenu({ categories }: { categories: Category[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  const bigLink = "block py-2.5 font-heading text-[1.75rem] leading-tight transition-colors duration-200 hover:text-gold-hover";

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label="Open menu"
        className="grid size-11 place-items-center rounded-full transition-colors duration-200 hover:bg-sand"
      >
        <Menu className="size-[1.375rem]" strokeWidth={1.5} />
      </button>

      <dialog
        ref={ref}
        aria-label="Menu"
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className="sheet-right m-0 ml-auto h-dvh max-h-dvh w-[min(26rem,100vw)] bg-background p-0 text-foreground"
        data-lenis-prevent
      >
        <div className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-5">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={close} aria-label={`${site.name} home`}>
              <Logo compact />
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="grid size-11 place-items-center rounded-full transition-colors duration-200 hover:bg-sand"
            >
              <X className="size-5" strokeWidth={1.5} />
            </button>
          </div>

          <form action="/search" role="search" onSubmit={close} className="relative mt-6">
            <label htmlFor="menu-search" className="sr-only">
              Search the collection
            </label>
            <input
              id="menu-search"
              name="q"
              type="search"
              placeholder="Search jewellery"
              autoComplete="off"
              className="h-12 w-full border border-border bg-surface pl-4 pr-12 text-base placeholder:text-muted-foreground focus-visible:border-gold sm:text-sm"
            />
            <button type="submit" aria-label="Search" className="absolute right-0 top-0 grid size-12 place-items-center text-muted-foreground transition-colors hover:text-foreground">
              <Search className="size-5" strokeWidth={1.5} />
            </button>
          </form>

          <nav aria-label="Shop" className="mt-8">
            <h2 className="text-sm text-muted-foreground">Shop</h2>
            <ul className="mt-2">
              <li>
                <Link href="/shop" onClick={close} className={bigLink}>
                  All jewellery
                </Link>
              </li>
              <li>
                <Link href="/shop?sort=newest" onClick={close} className={bigLink}>
                  New arrivals
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/collections/${c.slug}`} onClick={close} className={bigLink}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Help and information" className="mt-8 border-t border-border pt-6">
            <h2 className="text-sm text-muted-foreground">Help and information</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 text-[0.9375rem]">
              <li>
                <Link href="/about" onClick={close} className="block py-2 transition-colors hover:text-gold-hover">
                  About us
                </Link>
              </li>
              <li>
                <Link href="/contact" onClick={close} className="block py-2 transition-colors hover:text-gold-hover">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/wishlist" onClick={close} className="block py-2 transition-colors hover:text-gold-hover">
                  Wishlist
                </Link>
              </li>
              {helpNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={close} className="block py-2 transition-colors hover:text-gold-hover">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto space-y-1 border-t border-border pt-6 text-[0.9375rem]">
            <a href={`tel:${site.helplineTel}`} className="flex items-center gap-3 py-2 transition-colors hover:text-gold-hover">
              <Phone className="size-4 text-gold" strokeWidth={1.5} /> {site.helpline}
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 transition-colors hover:text-gold-hover">
              <MessageCircle className="size-4 text-gold" strokeWidth={1.5} /> Chat on WhatsApp
            </a>
            <a href={`mailto:${site.email}`} className="flex items-center gap-3 whitespace-nowrap py-2 transition-colors hover:text-gold-hover">
              <Mail className="size-4 shrink-0 text-gold" strokeWidth={1.5} /> {site.email}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
