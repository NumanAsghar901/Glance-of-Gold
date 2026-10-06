"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Phone menu for the admin panel. It opens under the sticky header, closes with a tap outside,
 * the Escape key, or as soon as the page changes (the menu only counts as open for the page it
 * was opened on), so it never stays over the page you just opened.
 */
export function AdminMobileMenu({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenAt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="admin-menu"
        onClick={() => setOpenAt(open ? null : pathname)}
        className="flex min-h-11 items-center gap-2 px-3 text-sm transition-colors duration-200 hover:bg-sand active:bg-sand"
      >
        {open ? <X className="size-5" strokeWidth={1.5} /> : <Menu className="size-5" strokeWidth={1.5} />}
        Menu
      </button>
      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={() => setOpenAt(null)}
            className="absolute inset-x-0 top-full h-dvh bg-foreground/30"
          />
          <div
            id="admin-menu"
            className="absolute inset-x-0 top-full z-10 max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain border-b border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
