import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/data/site";
import { formatPKR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about ordering, delivery, payment and returns at Glance of Gold.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const s = await getSettings();

  const faqs = [
    {
      q: "How do I place an order?",
      a: "Add your favourite pieces to your bag, go to checkout and enter your delivery details. We confirm every order with you on WhatsApp before dispatch.",
    },
    {
      q: "What payment methods do you accept?",
      a: "Cash on delivery is available on every order. Where shown at checkout you can also pay by JazzCash, Easypaisa or bank transfer; send us the transaction ID and we will verify it.",
    },
    {
      q: "How much is delivery?",
      a: `Delivery is a flat ${formatPKR(s.shippingFlat)} across Pakistan and free on orders of ${formatPKR(s.freeShippingThreshold)} or more. We ship with ${s.courier}.`,
    },
    {
      q: "How do I track my order?",
      a: (
        <>
          Use the <Link href="/track" className="underline underline-offset-4">tracking page</Link> with your order number and the mobile number you ordered with.
        </>
      ),
    },
    {
      q: "Can I return or exchange something?",
      a: (
        <>
          Yes, within 14 days of receiving your order. See the full{" "}
          <Link href="/returns-exchange" className="underline underline-offset-4">returns and exchange policy</Link>.
        </>
      ),
    },
    {
      q: "How does the free gift offer work?",
      a: "When our gift offer is running, add the required number of pieces to your bag and you can choose one free gift from the selection shown in your bag. No code is needed.",
    },
    {
      q: "I have a coupon code. Where do I use it?",
      a: "Enter it in the coupon box in your bag or at checkout. The discount is shown before you place your order.",
    },
    {
      q: "How can I contact you?",
      a: `Call or WhatsApp ${s.helpline}, or email ${s.email}.`,
    },
  ];

  return (
    <div className="wrap py-10 lg:py-16">
      <header className="text-center">
        <h1 className="text-title">Frequently asked questions</h1>
        <div className="mx-auto mt-4 h-px w-16 bg-gold" aria-hidden="true" />
      </header>

      <div className="mx-auto mt-12 max-w-2xl">
        {faqs.map((f) => (
          <details key={f.q} className="group border-b border-border first:border-t">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-heading text-xl [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="size-5 shrink-0 text-gold transition-transform duration-300 ease-(--ease-out) group-open:rotate-180" strokeWidth={1.5} />
            </summary>
            <p className="pb-6 text-[0.9375rem] leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
