import { Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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

  const cards = [
    {
      icon: MessageCircle,
      title: "WhatsApp",
      text: "The fastest way to reach us.",
      label: "Chat with us",
      href: whatsappLink("Hello Glance of Gold, I need some help.", settings.whatsapp),
      external: true,
    },
    {
      icon: Phone,
      title: "Helpline",
      text: settings.helpline,
      label: "Call now",
      href: `tel:${tel}`,
    },
    {
      icon: Mail,
      title: "Email",
      text: settings.email,
      label: "Send an email",
      href: `mailto:${settings.email}`,
    },
  ];

  return (
    <div className="wrap py-10 lg:py-16">
      <header className="text-center">
        <h1 className="text-title">Contact us</h1>
        <div className="mx-auto mt-4 h-px w-16 bg-gold" aria-hidden="true" />
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Questions about an order, a piece or a return? We are happy to help.
        </p>
      </header>

      <ul className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-3">
        {cards.map(({ icon: Icon, title, text, label, href, external }) => (
          <li key={title}>
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group flex h-full flex-col items-center gap-3 border border-border bg-surface p-8 text-center transition-[border-color,transform] duration-300 ease-(--ease-out) hover:-translate-y-0.5 hover:border-gold"
            >
              <Icon className="size-8 text-gold" strokeWidth={1.25} />
              <h2 className="font-heading text-2xl">{title}</h2>
              <p className="break-all text-sm text-muted-foreground">{text}</p>
              <span className="link-draw mt-2 text-[0.9375rem] group-hover:after:scale-x-100">{label}</span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-12 max-w-md text-center text-sm text-muted-foreground">
        Looking for an order? <Link href="/track" className="text-foreground underline underline-offset-4">Track it here</Link>.
      </p>
    </div>
  );
}
