"use client";

import {
  BadgePercent,
  CreditCard,
  Gem,
  Gift,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShoppingBag,
  Star,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LinkPending } from "@/components/ui/link-pending";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof Gem; exact?: boolean };

const groups: { label?: string; items: Item[] }[] = [
  {
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Gem },
      { href: "/admin/categories", label: "Categories", icon: Tags },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/coupons", label: "Coupons", icon: BadgePercent },
      { href: "/admin/gifts", label: "Free gift offer", icon: Gift },
      { href: "/admin/announcements", label: "Announcement bar", icon: Megaphone },
      { href: "/admin/banners", label: "Home banners", icon: ImageIcon },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/admin/payments", label: "Payment accounts", icon: CreditCard },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="space-y-6">
      {groups.map((g, i) => (
        <div key={i}>
          {g.label && <p className="mb-2 px-3 text-xs text-muted-foreground">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-11 items-center gap-3 px-3 text-sm transition-colors duration-200",
                      active ? "bg-sand text-foreground" : "text-muted-foreground hover:bg-sand/60 hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-[1.125rem]", active ? "text-gold-hover" : "text-gold")} strokeWidth={1.5} />
                    {label}
                    <LinkPending />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
