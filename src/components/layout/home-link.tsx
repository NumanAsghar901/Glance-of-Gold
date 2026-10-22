"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Link to the home page. On any other page it goes home as usual; when you are already on the home page the
 * router does nothing, so it scrolls back to the top instead.
 */
export function HomeLink({
  children,
  className,
  "aria-label": ariaLabel,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();

  return (
    <Link
      href="/"
      aria-label={ariaLabel}
      className={className}
      onClick={() => {
        onClick?.();
        if (pathname === "/") {
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        }
      }}
    >
      {children}
    </Link>
  );
}
