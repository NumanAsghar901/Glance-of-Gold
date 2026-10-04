import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { CartButton } from "@/components/cart/cart-drawer";
import { SiteMenu } from "@/components/layout/site-menu";
import { WishlistLink } from "@/components/layout/wishlist-link";
import { mainNav, site } from "@/lib/site";

const iconButton =
  "grid size-11 place-items-center rounded-full transition-colors duration-200 hover:bg-sand";

export function Header({ categories }: { categories: { id: number; slug: string; name: string }[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="wrap grid h-16 grid-cols-[1fr_auto] items-center gap-4 lg:h-20 lg:grid-cols-[1fr_auto_1fr]">
        <Link href="/" aria-label={`${site.name} home`} className="justify-self-start">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-10 text-[0.9375rem]">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="link-draw py-2">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-end">
          <Link href="/search" aria-label="Search" className={iconButton}>
            <Search className="size-5" strokeWidth={1.5} />
          </Link>
          <WishlistLink />
          <CartButton />
          <SiteMenu categories={categories} />
        </div>
      </div>
    </header>
  );
}
