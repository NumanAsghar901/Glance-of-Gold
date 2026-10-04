import { MessageCircle, RotateCcw, Truck, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductGrid } from "@/components/store/product-grid";
import { ArchFrame } from "@/components/ui/arch";
import { Button } from "@/components/ui/button";
import { RevealCover } from "@/components/ui/reveal-cover-lazy";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCategories, getProducts } from "@/lib/data/catalog";
import { getBanners, getGiftOffer, getSettings } from "@/lib/data/site";
import { whatsappLink } from "@/lib/site";
import { cn, formatPKR } from "@/lib/utils";

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
  const spotlight = featured.items[0] ?? newest.items[0];
  const spotlightImage = spotlight?.images[0];

  const trust = [
    { icon: Wallet, title: "Cash on delivery", text: "Pay when your order arrives" },
    { icon: Truck, title: "Free delivery", text: `On orders over ${formatPKR(settings.freeShippingThreshold)}` },
    { icon: RotateCcw, title: "Easy returns", text: "14 days to return or exchange" },
    { icon: MessageCircle, title: "WhatsApp support", text: `Helpline ${settings.helpline}` },
  ];

  return (
    <>
      {/* Hero ------------------------------------------------------------------ */}
      <section className="overflow-hidden">
        <div className="wrap grid items-center gap-14 pb-20 pt-8 lg:grid-cols-12 lg:gap-10 lg:pb-28 lg:pt-16">
          <div className="order-2 lg:order-1 lg:col-span-7">
            <h1 className="text-display hero-in max-w-[12ch]">
              {banner?.heading ?? "Jewellery made to be noticed"}
            </h1>
            <p className="hero-in hero-in-delay-1 mt-8 max-w-md text-lg leading-relaxed text-muted-foreground">
              {banner?.subheading ??
                "Fine, wearable pieces for every day and every occasion, delivered to your door across Pakistan."}
            </p>
            <div className="hero-in hero-in-delay-2 mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Button href={banner?.ctaUrl ?? "/shop"} size="lg">
                {banner?.ctaLabel ?? "Shop the collection"}
              </Button>
              <Link href="/shop?sort=newest" className="link-draw text-base">
                See what is new
              </Link>
            </div>
          </div>

          <div className="arch-in order-1 mx-auto w-full max-w-[24rem] pr-3 sm:pr-5 lg:order-2 lg:col-span-5 lg:max-w-none">
            <div className="relative">
              <ArchFrame>
                <Image
                  src={banner?.imageUrl ?? "/placeholders/hero.svg"}
                  alt={banner?.heading ?? "A layered gold necklace and jhumka earrings"}
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  quality={75}
                  className="object-cover"
                />
              </ArchFrame>

              {spotlight && (
                <Link
                  href={`/product/${spotlight.slug}`}
                  className="group absolute -bottom-5 left-3 flex items-center gap-3 bg-surface p-2.5 pr-5 shadow-[0_10px_30px_-12px_rgba(42,38,34,0.35)] transition-transform duration-300 ease-(--ease-out) hover:-translate-y-0.5 sm:-left-6 lg:-left-12"
                >
                  <span className="relative size-14 shrink-0 overflow-hidden bg-sand">
                    {spotlightImage && (
                      <Image src={spotlightImage.url} alt="" fill sizes="56px" quality={60} className="object-cover" />
                    )}
                  </span>
                  <span>
                    <span className="block font-heading text-lg leading-tight transition-colors duration-200 group-hover:text-gold-hover">
                      {spotlight.name}
                    </span>
                    <span className="block text-sm text-muted-foreground">{formatPKR(spotlight.price)}</span>
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust ----------------------------------------------------------------- */}
      <section aria-label="Why shop with us" className="border-y border-border">
        <ul className="wrap grid grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
          {trust.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3 py-6 lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <Icon className="mt-0.5 size-6 shrink-0 text-gold" strokeWidth={1.25} />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Categories: one large tile, the rest smaller, so the grid has a focal point -------- */}
      {categories.length > 0 && (
        <section className="wrap pt-24 lg:pt-32">
          <SectionHeading title="Shop by category" />
          <ul className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            {categories.map((c, i) => (
              <li key={c.id} className={cn(i === 0 && "col-span-2 lg:row-span-2")}>
                <Link
                  href={`/collections/${c.slug}`}
                  className={cn(
                    "group relative block h-full overflow-hidden bg-sand",
                    i === 0 ? "aspect-[16/11] lg:aspect-auto lg:min-h-full" : "aspect-[4/5]",
                  )}
                >
                  <Image
                    src={c.image_url ?? `/placeholders/${c.slug}-${i % 2 ? "b" : "a"}.svg`}
                    alt=""
                    fill
                    sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                    quality={75}
                    className="object-cover transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.04]"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2a2622]/60 via-[#2a2622]/20 to-transparent p-4 pt-20 text-white sm:p-6">
                    <span className={cn("block font-heading leading-none", i === 0 ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl")}>
                      {c.name}
                    </span>
                    <span className="mt-2 block h-px w-8 bg-gold transition-[width] duration-500 ease-(--ease-out) group-hover:w-16" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* New arrivals ---------------------------------------------------------- */}
      <section className="wrap pt-24 lg:pt-32">
        <SectionHeading title="New arrivals" linkLabel="View all" href="/shop?sort=newest" />
        <ProductGrid products={newest.items} priorityCount={0} className="mt-10" />
      </section>

      {/* Gift offer: the gifts are shown as round stones ------------------------------ */}
      {giftOffer && (
        <section className="mt-24 bg-blush lg:mt-32">
          <div className="wrap grid items-center gap-12 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24">
            <div>
              <h2 className="text-title max-w-md">Buy {giftOffer.minItems}, choose 1 free gift</h2>
              <p className="mt-5 max-w-md leading-relaxed text-foreground/80">
                Put {giftOffer.minItems} pieces in your bag and pick a gift from the selection. It is added to your
                order at no cost, and no code is needed.
              </p>
              <Button href="/shop" size="lg" variant="dark" className="mt-9">
                Start shopping
              </Button>
            </div>
            <ul className="flex flex-wrap justify-center gap-6 lg:justify-end">
              {giftOffer.options.slice(0, 3).map((o) => (
                <li key={o.variantId} className="w-28 text-center sm:w-36">
                  <div className="relative aspect-square overflow-hidden rounded-full bg-sand ring-1 ring-gold ring-offset-4 ring-offset-blush">
                    {o.image && (
                      <Image src={o.image} alt="" fill sizes="150px" quality={60} className="object-cover" />
                    )}
                  </div>
                  <p className="mt-4 text-sm leading-snug">{o.productName}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Favourites ------------------------------------------------------------------ */}
      {featured.items.length > 0 && (
        <section className="wrap pt-24 lg:pt-32">
          <SectionHeading title="Customer favourites" linkLabel="Shop all" href="/shop" />
          <ProductGrid products={featured.items} className="mt-10" />
        </section>
      )}

      {/* Story ------------------------------------------------------------------------ */}
      <section className="wrap grid items-center gap-14 pt-28 lg:grid-cols-12 lg:gap-10 lg:pt-36">
        <div className="mx-auto w-full max-w-[24rem] pr-3 sm:pr-5 lg:col-span-5 lg:max-w-none">
          <ArchFrame>
            <Image
              src="/placeholders/necklaces-b.svg"
              alt="A layered gold necklace with a coin pendant"
              fill
              sizes="(min-width: 1024px) 38vw, 90vw"
              quality={75}
              className="object-cover"
            />
            <RevealCover />
          </ArchFrame>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <h2 className="text-title">A glance is all it takes</h2>
          <p className="mt-8 max-w-lg font-heading text-3xl leading-snug sm:text-4xl">
            Beautiful jewellery should feel effortless to wear and easy to buy.
          </p>
          <p className="mt-8 max-w-md leading-relaxed text-muted-foreground">
            Every piece is chosen for its finish, its comfort and the way it catches the light, from everyday studs to
            statement bridal sets.
          </p>
          <Link href="/about" className="link-draw mt-8 inline-block">
            Read our story
          </Link>
        </div>
      </section>

      {/* Help -------------------------------------------------------------------------- */}
      <section className="wrap pt-28 lg:pt-36">
        <div className="flex flex-col items-start justify-between gap-6 border-y border-border py-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-3xl">Need help choosing?</h2>
            <p className="mt-2 text-muted-foreground">Message us and we will help you find the right piece.</p>
          </div>
          <Button
            href={whatsappLink("Hello Glance of Gold, I need some help.", settings.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="lg"
          >
            <MessageCircle /> Chat on WhatsApp
          </Button>
        </div>
      </section>
    </>
  );
}
