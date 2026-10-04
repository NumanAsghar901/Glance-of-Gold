import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView } from "@/components/store/shop-view";
import { getCategories } from "@/lib/data/catalog";
import { readShopParams } from "@/lib/shop-params";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? `Shop ${category.name} from Glance of Gold.`,
    alternates: { canonical: `/collections/${slug}` },
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
