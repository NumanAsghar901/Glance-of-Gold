import { Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/store/contact-form";
import { getSettings } from "@/lib/data/site";
import { whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Call, WhatsApp or email Glance of Gold. We are happy to help with your order.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  const tel = `+${settings.whatsapp.replace(/\D/g, "")}`;

  const ways = [
    {
      icon: MessageCircle,
      title: "WhatsApp",
      text: "The fastest way to reach us",
      href: whatsappLink("Hello Glance of Gold, I need some help.", settings.whatsapp),
      external: true,
    },
    { icon: Phone, title: "Call the helpline", text: settings.helpline, href: `tel:${tel}` },
    { icon: Mail, title: "Email", text: settings.email, href: `mailto:${settings.email}` },
  ];

  return (
    <div className="wrap py-10 lg:py-20">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
        <header className="lg:col-span-5">
          <h1 className="text-display text-[clamp(2.5rem,1.5rem+4vw,4.5rem)]">Talk to us</h1>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-muted-foreground">
            Questions about an order, a piece or a return? Message us and we will reply as soon as we can.
          </p>

          <ul className="mt-10 divide-y divide-border border-y border-border">
            {ways.map(({ icon: Icon, title, text, href, external }) => (
              <li key={title}>
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex items-center gap-4 py-5 transition-colors duration-200"
                >
                  <Icon className="size-6 shrink-0 text-gold" strokeWidth={1.25} />
                  <span className="min-w-0">
                    <span className="block font-heading text-2xl leading-tight transition-colors duration-200 group-hover:text-gold-hover">{title}</span>
                    <span className="block text-sm text-muted-foreground [overflow-wrap:anywhere]">{text}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-sm text-muted-foreground">
            Looking for an order? <Link href="/track" className="text-foreground underline underline-offset-4">Track it here</Link>.
          </p>
        </header>

        <section aria-labelledby="message-heading" className="lg:col-span-6 lg:col-start-7">
          <h2 id="message-heading" className="font-heading text-3xl">
            Send a message
          </h2>
          <div className="mt-6 border border-border bg-surface p-5 sm:p-8">
            <ContactForm />
          </div>
        </section>
      </div>
    </div>
  );
}
