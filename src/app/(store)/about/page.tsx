import type { Metadata } from "next";
import Image from "next/image";
import { ArchFrame } from "@/components/ui/arch";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About us",
  description: "The story behind Glance of Gold, a Pakistani jewellery brand.",
  alternates: { canonical: "/about" },
};

const values = [
  { title: "Made to be worn", text: "Pieces chosen for comfort and finish, so they feel as good as they look." },
  { title: "Honest and simple", text: "Clear prices, cash on delivery and a team you can reach on WhatsApp." },
  { title: "Delivered with care", text: "Every order is packed carefully and sent to your door with Leopards." },
];

export default function AboutPage() {
  return (
    <>
      <section className="wrap grid items-center gap-14 overflow-hidden pb-20 pt-10 lg:grid-cols-12 lg:gap-10 lg:pb-28 lg:pt-16">
        <div className="order-2 lg:order-1 lg:col-span-7">
          <h1 className="text-display hero-in max-w-[12ch]">A glance is all it takes</h1>
          <p className="hero-in hero-in-delay-1 mt-8 max-w-md text-lg leading-relaxed text-muted-foreground">
            Glance of Gold is a Pakistani jewellery brand built on a simple idea: beautiful jewellery should be
            effortless to wear and easy to buy.
          </p>
        </div>
        <div className="arch-in order-1 mx-auto w-full max-w-[24rem] pr-3 sm:pr-5 lg:order-2 lg:col-span-5 lg:max-w-none">
          <ArchFrame>
            <Image
              src="/placeholders/sets-b.svg"
              alt="A gold necklace with matching earrings"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              quality={75}
              className="object-cover"
            />
          </ArchFrame>
        </div>
      </section>

      <section className="wrap max-w-4xl pb-24 lg:pb-32">
        <p className="font-heading text-3xl leading-snug sm:text-4xl lg:text-5xl">
          We choose each piece for its finish, its comfort and the way it catches the light, from everyday studs to
          statement bridal sets.
        </p>
      </section>

      <section className="wrap pb-24 lg:pb-32">
        <ul className="grid gap-10 md:grid-cols-3 md:gap-12">
          {values.map((v) => (
            <li key={v.title} className="reveal border-t border-gold pt-6">
              <h2 className="font-heading text-3xl">{v.title}</h2>
              <p className="mt-3 max-w-xs leading-relaxed text-muted-foreground">{v.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-sand">
        <div className="wrap flex flex-col items-start justify-between gap-8 py-16 sm:flex-row sm:items-center lg:py-20">
          <h2 className="text-title">Find your piece</h2>
          <Button href="/shop" size="lg">
            Shop the collection
          </Button>
        </div>
      </section>
    </>
  );
}
