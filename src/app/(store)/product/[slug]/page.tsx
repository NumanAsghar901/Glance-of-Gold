import { ChevronDown, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductGrid } from "@/components/store/product-grid";
import { ProductPurchase } from "@/components/store/product-purchase";
import { Price } from "@/components/ui/price";
import { SectionHeading } from "@/components/ui/section-heading";
import { getProduct, getRelatedProducts } from "@/lib/data/catalog";
import { getPaymentAccounts, getSettings } from "@/lib/data/site";
import { site } from "@/lib/site";
import { formatPKR } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  const description =
    product.description?.slice(0, 155) ?? `${product.name} from ${site.name}. Cash on delivery across Pakistan.`;
  const image = product.images.find((i) => !i.url.endsWith(".svg"))?.url;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${slug}` },
    openGraph: { title: product.name, description, type: "website", images: image ? [image] : undefined },
  };
}

function Detail({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-border">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between py-4 font-heading text-xl [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 transition-transform duration-300 ease-(--ease-out) group-open:rotate-180" strokeWidth={1.5} />
      </summary>
      <div className="pb-6 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [related, settings, accounts] = await Promise.all([
    getRelatedProducts(product.category?.slug ?? null, product.id),
    getSettings(),
    getPaymentAccounts(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images.map((i) => (i.url.startsWith("http") ? i.url : `${site.url}${i.url}`)),
    sku: String(product.id),
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      url: `${site.url}/product/${product.slug}`,
      priceCurrency: "PKR",
      price: product.price,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const transfers = accounts.length > 0;

  return (
    <div className="wrap py-6 lg:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="link-draw">Home</Link>
          </li>
          <li aria-hidden="true">/</li>
          {product.category && (
            <>
              <li>
                <Link href={`/collections/${product.category.slug}`} className="link-draw">
                  {product.category.name}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
            </>
          )}
          <li aria-current="page" className="text-foreground">{product.name}</li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />

        <div className="lg:py-4">
          <h1 className="text-title">{product.name}</h1>
          <Price price={product.price} compareAt={product.compareAtPrice} className="mt-4 text-lg" />
          <p className="mt-1 text-xs text-muted-foreground">
            {settings.freeShippingThreshold > 0 &&
              `Free delivery on orders over ${formatPKR(settings.freeShippingThreshold)}`}
          </p>

          {product.description && (
            <p className="mt-6 max-w-prose text-[0.9375rem] leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          <div className="mt-8">
            <ProductPurchase product={product} />
          </div>

          <ul className="mt-8 grid gap-4 border-y border-border py-6 text-sm">
            <li className="flex items-center gap-3">
              <Truck className="size-5 shrink-0 text-gold" strokeWidth={1.25} />
              Cash on delivery across Pakistan
            </li>
            <li className="flex items-center gap-3">
              <RotateCcw className="size-5 shrink-0 text-gold" strokeWidth={1.25} />
              14-day returns and exchanges
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-5 shrink-0 text-gold" strokeWidth={1.25} />
              Order confirmed with you on WhatsApp
            </li>
          </ul>

          <div className="mt-2">
            <Detail title="Details" defaultOpen>
              <ul className="space-y-1.5">
                {product.material && <li>Finish: {product.material}</li>}
                {product.category && <li>Category: {product.category.name}</li>}
                {product.variants.length > 1 && (
                  <li>Available in: {product.variants.map((v) => v.name).join(", ")}</li>
                )}
              </ul>
            </Detail>
            <Detail title="Delivery">
              <p>
                Delivery by {settings.courier} across Pakistan. A flat {formatPKR(settings.shippingFlat)} delivery
                charge applies, and delivery is free on orders over {formatPKR(settings.freeShippingThreshold)}.
              </p>
            </Detail>
            <Detail title="Payment">
              <p>
                Pay with cash on delivery when your order arrives.
                {transfers && " JazzCash, Easypaisa and bank transfer are also available at checkout."}
              </p>
            </Detail>
            <Detail title="Returns and exchanges">
              <p>
                You can request a return or exchange within 14 days of receiving your order.{" "}
                <Link href="/returns-exchange" className="text-foreground underline underline-offset-4">
                  Read the full policy
                </Link>
                .
              </p>
            </Detail>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pt-20 lg:pt-28">
          <SectionHeading title="You may also like" />
          <ProductGrid products={related} className="mt-10" />
        </section>
      )}
    </div>
  );
}
