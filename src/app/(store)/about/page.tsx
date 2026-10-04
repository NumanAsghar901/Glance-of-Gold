import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

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
      <section className="wrap grid items-center gap-10 py-10 md:grid-cols-2 md:gap-16 lg:py-20">
        <div>
          <p className="text-eyebrow hero-in text-gold-hover">Our story</p>
          <h1 className="text-display hero-in hero-in-delay-1 mt-4">A glance is all it takes</h1>
          <div className="mt-6 h-px w-16 bg-gold" aria-hidden="true" />
          <p className="hero-in hero-in-delay-2 mt-6 max-w-md text-muted-foreground">
            Glance of Gold is a Pakistani jewellery brand built on a simple idea: beautiful jewellery should be
            effortless to wear and easy to buy.
          </p>
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden bg-sand md:max-w-none">
          <Image
            src="/placeholders/sets-b.svg"
            alt="Glance of Gold jewellery"
            fill
            priority
            sizes="(min-width: 768px) 45vw, 90vw"
            quality={75}
            className="object-cover"
          />
        </div>
      </section>

      <section className="wrap max-w-3xl pb-16 text-center">
        <Reveal>
          <p className="font-heading text-2xl leading-snug sm:text-3xl">
            We choose each piece for its finish, its comfort and the way it catches the light, from everyday studs to
            statement bridal sets.
          </p>
        </Reveal>
      </section>

      <section className="bg-sand">
        <ul className="wrap grid gap-10 py-16 md:grid-cols-3 lg:py-20">
          {values.map((v, i) => (
            <li key={v.title}>
              <Reveal delay={i * 0.08}>
                <div className="mb-5 h-px w-10 bg-gold" aria-hidden="true" />
                <h2 className="font-heading text-2xl">{v.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.text}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap py-16 text-center lg:py-24">
        <Reveal>
          <h2 className="text-title">Find your piece</h2>
          <Button href="/shop" size="lg" className="mt-8">
            Shop the collection
          </Button>
        </Reveal>
      </section>
    </>
  );
}
