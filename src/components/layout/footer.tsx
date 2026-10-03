import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { helpNav, mainNav, site, whatsappLink } from "@/lib/site";

const linkClass = "link-draw py-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground";

export function Footer() {
  return (
    <footer className="mt-24 bg-sand">
      <div className="hairline" />
      <div className="wrap grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:py-20">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {site.tagline}. Pieces chosen to catch the light and last beyond the season, delivered
            across Pakistan.
          </p>
        </div>

        <nav aria-label="Shop">
          <h2 className="text-eyebrow text-foreground">Shop</h2>
          <ul className="mt-5 flex flex-col items-start gap-2">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Help">
          <h2 className="text-eyebrow text-foreground">Help</h2>
          <ul className="mt-5 flex flex-col items-start gap-2">
            {helpNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-eyebrow text-foreground">Contact</h2>
          <ul className="mt-5 flex flex-col items-start gap-3 text-sm text-muted-foreground">
            <li>
              <a href={`tel:${site.helplineTel}`} className="link-draw flex items-center gap-3 py-1 hover:text-foreground">
                <Phone className="size-4 text-gold" strokeWidth={1.5} />
                Helpline {site.helpline}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="link-draw flex items-center gap-3 py-1 hover:text-foreground">
                <Mail className="size-4 text-gold" strokeWidth={1.5} />
                {site.email}
              </a>
            </li>
            <li>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="link-draw py-1 hover:text-foreground"
              >
                Chat on WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="wrap flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>Cash on Delivery &middot; JazzCash &middot; Easypaisa &middot; Bank Transfer</p>
        </div>
      </div>
    </footer>
  );
}
