"use client";

import { useRef } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { helpNav, mainNav, site } from "@/lib/site";

/**
 * Native <dialog>: focus trap, Esc to close and inert background come from the
 * browser, so there is no extra JS dependency for low-end phones.
 */
export function MobileNav() {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label="Open menu"
        className="grid size-11 place-items-center rounded-full transition-colors duration-200 hover:bg-sand lg:hidden"
      >
        <Menu className="size-5" strokeWidth={1.5} />
      </button>

      <dialog
        ref={ref}
        aria-label="Menu"
        onClick={(e) => {
          // Click on the backdrop (the dialog element itself) closes it.
          if (e.target === ref.current) close();
        }}
        className="sheet-left m-0 h-dvh max-h-dvh w-[min(22rem,88vw)] bg-background p-0 text-foreground"
      >
        <div className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-5">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={close} aria-label={`${site.name} home`}>
              <Logo />
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

          <div className="hairline mt-5" />

          <nav aria-label="Primary" className="mt-6">
            <ul className="flex flex-col">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className="block py-3 font-heading text-3xl transition-colors duration-200 hover:text-gold-hover"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Help" className="mt-auto pt-10">
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {helpNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className="block py-2 transition-colors duration-200 hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm">
              <a href={`tel:${site.helplineTel}`} className="link-draw">
                {site.helpline}
              </a>
            </p>
          </nav>
        </div>
      </dialog>
    </>
  );
}
