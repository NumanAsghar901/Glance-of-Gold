/** The live store. Used whenever no other address is configured, so production never falls back to localhost. */
export const PRODUCTION_URL = "https://www.littleluxeglow.com";

const trimSlash = (u: string) => u.replace(/\/+$/, "");

const isProd = process.env.NODE_ENV === "production";
const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
const resolvedUrl = isProd && envUrl?.includes("localhost") ? PRODUCTION_URL : (envUrl ?? PRODUCTION_URL);

export const site = {
  name: "Little Luxe Glow",
  tagline: "Pakistani Jewellery Brand",
  description:
    "Little Luxe Glow is a Pakistani jewellery brand. Discover handcrafted nose rings, rings, necklaces, earrings and bangles with cash on delivery across Pakistan.",
  url: trimSlash(resolvedUrl),
  // Every link inside an email points here (also when the order was placed on a local dev copy).
  emailUrl: trimSlash(process.env.EMAIL_SITE_URL ?? PRODUCTION_URL),
  helpline: "0316 6568142",
  helplineTel: "+923166568142",
  email: "Littleluxeglowofficial@gmail.com",
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
