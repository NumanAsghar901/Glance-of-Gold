import { ArrowRight, MessageCircle, PackageCheck, RotateCcw, Truck, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductGrid } from "@/components/store/product-grid";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCategories, getProducts } from "@/lib/data/catalog";
import { getBanners, getGiftOffer, getSettings } from "@/lib/data/site";
import { whatsappLink } from "@/lib/site";
import { formatPKR } from "@/lib/utils";

export default async function Home() {
  const [banners, categories, newest, featured, giftOffer, settings] = await Promise.all([
    getBanners(),
    getCategories(),
    getProducts({ sort: "newest", pageSize: 8 }),
    getProducts({ featuredOnly: true, sort: "featured", pageSize: 4 }),
    getGiftOffer(),
    getSettings(),
  ]);

  const banner = banners[0];
  const heroImage = banner?.imageUrl ?? "/placeholders/sets-a.svg";
  const trust = [
    { icon: Wallet, title: "Cash on delivery", text: "Pay when your order arrives" },
    {
      icon: Truck,
      title: "Free delivery",
      text: `On orders over ${formatPKR(settings.freeShippingThreshold)}`,
    },
    { icon: RotateCcw, title: "Easy returns", text: "14 days to return or exchange" },
    { icon: MessageCircle, title: "WhatsApp support", text: `Helpline ${settings.helpline}` },
  ];

  return (
    <>
      {/* Hero ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden bg-sand">
        <div className="wrap grid items-center gap-10 py-10 md:grid-cols-2 md:gap-6 md:py-0 lg:min-h-[min(46rem,82dvh)]">
          <div className="order-2 md:order-1 md:py-20">
            <p className="hero-in text-eyebrow text-gold-hover">
              {banner?.subheading ? banner.subheading : "New season, new sparkle"}
            </p>
            <h1 className="hero-in hero-in-delay-1 text-display mt-5 max-w-xl">
              {banner?.heading ?? "Jewellery made to be noticed"}
            </h1>
            <p className="hero-in hero-in-delay-2 mt-6 max-w-md text-muted-foreground">
              Fine, wearable pieces for every day and every occasion, delivered to your door across
              Pakistan.
            </p>
            <div className="hero-in hero-in-delay-2 mt-9 flex flex-wrap items-center gap-4">
              <Button href={banner?.ctaUrl ?? "/shop"} size="lg">
                {banner?.ctaLabel ?? "Shop the collection"} <ArrowRight />
              </Button>
              <Button href="/shop?sort=newest" variant="outline" size="lg">
                New arrivals
              </Button>
            </div>
          </div>

          <div className="order-1 md:order-2 md:self-stretch">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md md:absolute md:inset-y-0 md:right-0 md:mx-0 md:aspect-auto md:max-w-none md:w-[48%]">
              <Image
                src={heroImage}
                alt={banner?.heading ?? "Glance of Gold jewellery"}
                fill
                priority
                sizes="(min-width: 768px) 48vw, 90vw"
                quality={75}
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust row --------------------------------------------------------------- */}
      <section aria-label="Why shop with us" className="border-b border-border bg-background">
        <ul className="wrap grid grid-cols-2 gap-x-4 gap-y-6 py-8 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-6 shrink-0 text-gold" strokeWidth={1.25} />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Categories -------------------------------------------------------------- */}
      {categories.length > 0 && (
        <section className="wrap pt-20 lg:pt-28">
          <Reveal>
            <SectionHeading eyebrow="Collections" title="Shop by category" />
          </Reveal>
          <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-5">
            {categories.map((c, i) => (
              <li key={c.id}>
                <Reveal delay={i * 0.05}>
                  <Link
                    href={`/collections/${c.slug}`}
                    className="group relative block aspect-[3/4] overflow-hidden bg-sand"
                  >
                    <Image
                      src={c.image_url ?? `/placeholders/${c.slug}-a.svg`}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 18vw, (min-width: 768px) 30vw, 48vw"
                      quality={75}
                      className="object-cover transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.04]"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[#2a2622]/55 to-transparent p-4 pt-14 text-white">
                      <span className="font-heading text-2xl leading-none">{c.name}</span>
                      <ArrowRight className="size-5 transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-1" strokeWidth={1.5} />
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* New arrivals -------------------------------------------------------------- */}
      <section className="wrap pt-20 lg:pt-28">
        <Reveal>
          <SectionHeading
            eyebrow="Just in"
            title="New arrivals"
            linkLabel="View all"
            href="/shop?sort=newest"
          />
        </Reveal>
        <ProductGrid products={newest.items} className="mt-10" />
      </section>

      {/* Gift offer ---------------------------------------------------------------- */}
      {giftOffer && (
        <section className="mt-20 bg-blush lg:mt-28">
          <div className="wrap grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-20">
            <Reveal>
              <p className="text-eyebrow text-gold-hover">Limited offer</p>
              <h2 className="text-title mt-3 max-w-md">
                Buy {giftOffer.minItems}, choose 1 free gift
              </h2>
              <p className="mt-5 max-w-md text-foreground/80">
                Add {giftOffer.minItems} pieces to your bag and pick a complimentary gift from our
                selection. No code needed.
              </p>
              <Button href="/shop" className="mt-8" size="lg">
                Start shopping <ArrowRight />
              </Button>
            </Reveal>
            <Reveal delay={0.1}>
              <ul className="grid grid-cols-3 gap-3 sm:gap-5">
                {giftOffer.options.slice(0, 3).map((o) => (
                  <li key={o.variantId}>
                    <div className="relative aspect-[4/5] overflow-hidden bg-sand">
                      {o.image && (
                        <Image src={o.image} alt="" fill sizes="(min-width: 1024px) 14vw, 30vw" quality={60} className="object-cover" />
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-snug sm:text-sm">{o.productName}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      )}

      {/* Featured -------------------------------------------------------------------- */}
      {featured.items.length > 0 && (
        <section className="wrap pt-20 lg:pt-28">
          <Reveal>
            <SectionHeading eyebrow="Our picks" title="Customer favourites" linkLabel="Shop all" href="/shop" />
          </Reveal>
          <ProductGrid products={featured.items} className="mt-10" />
        </section>
      )}

      {/* Brand story ----------------------------------------------------------------- */}
      <section className="wrap grid items-center gap-10 pt-20 md:grid-cols-2 md:gap-16 lg:pt-28">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden bg-sand">
            <Image
              src="/placeholders/necklaces-b.svg"
              alt="A Glance of Gold necklace"
              fill
              sizes="(min-width: 768px) 45vw, 90vw"
              quality={75}
              className="object-cover"
            />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-eyebrow text-gold-hover">Our story</p>
          <h2 className="text-title mt-3 max-w-md">A glance is all it takes</h2>
          <div className="mt-5 h-px w-16 bg-gold" aria-hidden="true" />
          <p className="mt-6 max-w-md text-muted-foreground">
            Glance of Gold began with a simple idea: beautiful jewellery should feel effortless to
            wear and easy to buy. Each piece is chosen for its finish, comfort and the way it
            catches the light, from everyday studs to statement bridal sets.
          </p>
          <Link href="/about" className="link-draw mt-8 inline-block text-[0.8125rem] uppercase tracking-[0.14em]">
            Read more about us
          </Link>
        </Reveal>
      </section>

      {/* WhatsApp band ----------------------------------------------------------------- */}
      <section className="wrap pt-20 lg:pt-28">
        <Reveal>
          <div className="flex flex-col items-center gap-6 border border-border bg-surface px-6 py-12 text-center sm:py-16">
            <PackageCheck className="size-8 text-gold" strokeWidth={1.25} />
            <h2 className="text-title max-w-xl">Need help choosing?</h2>
            <p className="max-w-md text-muted-foreground">
              Message us on WhatsApp and we will help you find the right piece, or confirm your order in minutes.
            </p>
            <Button href={whatsappLink("Hello Glance of Gold, I need some help.")} target="_blank" rel="noopener noreferrer" variant="dark" size="lg">
              Chat on WhatsApp <ArrowRight />
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
