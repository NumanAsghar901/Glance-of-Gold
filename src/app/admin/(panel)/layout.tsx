import { ExternalLink, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/brand/logo";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="relative border-b border-border bg-surface lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block lg:px-5 lg:py-6">
          <Link href="/admin" prefetch={false} aria-label="Admin home">
            <Logo compact />
          </Link>
          <details className="group lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-sm [&::-webkit-details-marker]:hidden">
              Menu
            </summary>
            <div className="absolute inset-x-0 top-full z-20 border-b border-border bg-surface p-4 shadow-sm">
              <AdminNav />
              <form action={signOut} className="mt-4 border-t border-border pt-3">
                <button type="submit" className="flex min-h-11 items-center gap-3 px-3 text-sm text-muted-foreground">
                  <LogOut className="size-4 text-gold" strokeWidth={1.5} /> Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
        <div className="hidden px-2 pb-6 lg:block">
          <AdminNav />
          <div className="mt-8 space-y-1 border-t border-border px-1 pt-6">
            <Link
              href="/"
              prefetch={false}
              target="_blank"
              className="flex min-h-11 items-center gap-3 px-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-4 text-gold" strokeWidth={1.5} /> View store
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center gap-3 px-2 text-left text-sm text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-4 text-gold" strokeWidth={1.5} /> Sign out
              </button>
            </form>
            <p className="truncate px-2 pt-2 text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">{children}</main>
      </div>
    </div>
  );
}
