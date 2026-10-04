/** The live store. Used whenever no other address is configured, so production never falls back to localhost. */
export const PRODUCTION_URL = "https://glance-of-gold.vercel.app";

const trimSlash = (u: string) => u.replace(/\/+$/, "");

export const site = {
  name: "Glance of Gold",
  tagline: "Jewellery for every glance",
  description:
    "Glance of Gold is a Pakistani jewellery brand. Discover elegant necklaces, earrings, rings and bangles with cash on delivery across Pakistan.",
  url: trimSlash(process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_URL),
  // Every link inside an email points here (also when the order was placed on a local dev copy).
  emailUrl: trimSlash(process.env.EMAIL_SITE_URL ?? PRODUCTION_URL),
  helpline: "0316 6568142",
  helplineTel: "+923166568142",
  email: "Glanceofgold@gmail.com",
  // International format without "+" for wa.me links. Defaults to the helpline.
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "923166568142",
  courier: "Leopards",
} as const;

export const mainNav = [
  { label: "Shop", href: "/shop" },
  { label: "New Arrivals", href: "/shop?sort=newest" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const helpNav = [
  { label: "Track Order", href: "/track" },
  { label: "Returns & Exchange", href: "/returns-exchange" },
  { label: "Shipping", href: "/shipping" },
  { label: "FAQ", href: "/faq" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
] as const;

/** wa.me link for a number in international format without "+". Defaults to the business number. */
export function whatsappLink(message?: string, number: string = site.whatsapp) {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
