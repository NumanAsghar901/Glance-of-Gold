import { ChevronDown, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryEstimate } from "@/components/store/delivery-estimate";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductGrid } from "@/components/store/product-grid";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ProductReviews } from "@/components/store/product-reviews";
import { LivePrice, PurchaseProvider } from "@/components/store/purchase-context";
import { StockLeft } from "@/components/store/stock-left";
import { StarRating } from "@/components/ui/star-rating";
import { StockTag } from "@/components/ui/stock-tag";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAllProductSlugs, getProduct, getRelatedProducts } from "@/lib/data/catalog";
import { getProductReviews } from "@/lib/data/reviews";
import { getPaymentAccounts, getSettings } from "@/lib/data/site";
import { site } from "@/lib/site";
import { formatPKR } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

// Pre-render every product at build time. New products are rendered on first visit,
// and admin edits refresh the cached data through the "catalog" tag.
export async function generateStaticParams() {
  try {
    const slugs = await getAllProductSlugs();
    return slugs.map((p) => ({ slug: p.slug }));
  } catch {
    // A database hiccup at build time must not fail the build; pages render on first visit instead.
    return [];
  }
}

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

  const [related, settings, accounts, reviewData] = await Promise.all([
    getRelatedProducts(product.category?.slug ?? null, product.id),
    getSettings(),
    getPaymentAccounts(),
    getProductReviews(product.id),
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
    ...(product.ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.ratingCount } }
      : {}),
  };

  const transfers = accounts.length > 0;

  // For the Details section: the colours on offer, and the sizes, designs or options (without the colour).
  const colours = [...new Set(product.variants.flatMap((v) => (v.color ? [v.color] : [])))];
  const options = [...new Set(product.variants.map((v) => v.label).filter(Boolean))];
  const optionTitle = product.optionLabel === "Option" ? "Options" : `${product.optionLabel}s`;

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
          <PurchaseProvider product={product}>
          <h1 className="text-title">{product.name}</h1>
          {(product.ratingCount > 0 || product.soldCount > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              {product.ratingCount > 0 && (
                <a href="#reviews" className="inline-flex items-center gap-2 transition-colors hover:text-gold-hover">
                  <StarRating rating={product.rating} />
                  <span className="font-medium">{product.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground underline underline-offset-4">
                    {product.ratingCount} {product.ratingCount === 1 ? "review" : "reviews"}
                  </span>
                </a>
              )}
              {product.soldCount > 0 && <span className="text-muted-foreground">{product.soldCount} sold</span>}
            </div>
          )}
          <LivePrice className="mt-4 text-lg" />
          <StockTag inStock={product.inStock} lowStock={product.lowStock} className="mt-3 inline-block" />
          <p className="mt-1 text-xs text-muted-foreground">
            {settings.freeShippingThreshold > 0 &&
              `Free delivery on orders over ${formatPKR(settings.freeShippingThreshold)}`}
          </p>

          <StockLeft className="mt-5" />
          <DeliveryEstimate className="mt-3" minDays={settings.deliveryDaysMin} maxDays={settings.deliveryDaysMax} />

          <div className="mt-8">
            <ProductPurchase />
          </div>
          </PurchaseProvider>

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
            <Detail title="Product information" defaultOpen>
              {product.description && <p className="mb-4 max-w-prose whitespace-pre-line">{product.description}</p>}
              <ul className="space-y-1.5">
                {product.material && <li>Finish: {product.material}</li>}
                {product.category && <li>Category: {product.category.name}</li>}
                {colours.length > 0 && <li>{colours.length === 1 ? "Colour" : "Colours"}: {colours.join(", ")}</li>}
                {options.length > 1 && (
                  <li>
                    {optionTitle}: {options.join(", ")}
                  </li>
                )}
              </ul>
            </Detail>
            <Detail title="Delivery">
              <p>
                Delivery by {settings.courier} across Pakistan, usually in{" "}
                {settings.deliveryDaysMin === settings.deliveryDaysMax
                  ? `${settings.deliveryDaysMin} ${settings.deliveryDaysMin === 1 ? "day" : "days"}`
                  : `${settings.deliveryDaysMin} to ${settings.deliveryDaysMax} days`}
                . A flat {formatPKR(settings.shippingFlat)} delivery charge applies, and delivery is free on orders
                over {formatPKR(settings.freeShippingThreshold)}.
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

      <ProductReviews product={product} data={reviewData} />

      {related.length > 0 && (
        <section className="pt-20 lg:pt-28">
          <SectionHeading title="You may also like" />
          <ProductGrid products={related} className="mt-10" />
        </section>
      )}
    </div>
  );
}
