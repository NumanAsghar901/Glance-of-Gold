import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { helpNav, mainNav, site, whatsappLink } from "@/lib/site";

const linkClass = "link-draw py-1 text-[0.9375rem] text-muted-foreground transition-colors duration-200 hover:text-foreground";

export function Footer() {
  return (
    <footer className="mt-28 bg-sand">
      <div className="wrap py-16 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="reveal lg:col-span-4">
            <Logo />
            <p className="mt-8 max-w-sm font-heading text-3xl leading-snug">
              Jewellery chosen to catch the light, delivered across Pakistan.
            </p>
          </div>

          <nav aria-label="Shop" className="reveal lg:col-span-2">
            <h2 className="font-heading text-xl">Shop</h2>
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

          <nav aria-label="Help" className="reveal lg:col-span-3">
            <h2 className="font-heading text-xl">Help</h2>
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

          <div className="reveal lg:col-span-3">
            <h2 className="font-heading text-xl">Contact</h2>
            <ul className="mt-5 flex flex-col items-start gap-3 text-[0.9375rem] text-muted-foreground">
              <li>
                <a href={`tel:${site.helplineTel}`} className="link-draw flex items-center gap-3 py-1 hover:text-foreground">
                  <Phone className="size-4 shrink-0 text-gold" strokeWidth={1.5} />
                  {site.helpline}
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}`} className="link-draw flex items-center gap-3 whitespace-nowrap py-1 hover:text-foreground">
                  <Mail className="size-4 shrink-0 text-gold" strokeWidth={1.5} />
                  {site.email}
                </a>
              </li>
              <li>
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="link-draw py-1 hover:text-foreground">
                  Chat on WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="wrap grid gap-2 py-6 text-center text-sm text-muted-foreground sm:grid-cols-3 sm:items-center">
          <p className="sm:text-left">&copy; {new Date().getFullYear()} {site.name}</p>
          <p>
            Developed by{" "}
            <a
              href="https://portfolio-numanasghar.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="link-draw text-foreground"
            >
              Numan Asghar
            </a>
          </p>
          <p className="sm:text-right">Cash on delivery across Pakistan</p>
        </div>
      </div>
    </footer>
  );
}
