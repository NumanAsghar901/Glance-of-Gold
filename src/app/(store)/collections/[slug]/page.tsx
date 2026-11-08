import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView } from "@/components/store/shop-view";
import { getCategories } from "@/lib/data/catalog";
import { readShopParams } from "@/lib/shop-params";

import { site } from "@/lib/site";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  try {
    const categories = await getCategories();
    return categories.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) return {};
  const description = category.description ?? `Shop ${category.name} from Little Luxe Glow with cash on delivery across Pakistan.`;
  return {
    title: category.name,
    description,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: {
      title: `${category.name} | ${site.name}`,
      description,
      url: `${site.url}/collections/${slug}`,
      siteName: site.name,
      images: [
        {
          url: `${site.url}/opengraph-image.png`,
          width: 1200,
          height: 630,
          alt: `${category.name} - Little Luxe Glow`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} | ${site.name}`,
      description,
      images: [`${site.url}/opengraph-image.png`],
    },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) notFound();

  return (
    <ShopView
      basePath={`/collections/${slug}`}
      params={readShopParams(await searchParams)}
      categorySlug={slug}
      title={category.name}
      description={category.description}
    />
  );
}
