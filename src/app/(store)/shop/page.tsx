import type { Metadata } from "next";
import { ShopView } from "@/components/store/shop-view";
import { getCategories } from "@/lib/data/catalog";
import { readShopParams } from "@/lib/shop-params";

import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shop All Jewellery",
  description: "Browse necklaces, earrings, rings, bangles and bridal sets from Little Luxe Glow with cash on delivery across Pakistan.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop All Jewellery | Little Luxe Glow",
    description: "Browse necklaces, earrings, rings, bangles and bridal sets from Little Luxe Glow with cash on delivery across Pakistan.",
    url: `${site.url}/shop`,
    siteName: site.name,
    images: [
      {
        url: `${site.url}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: "Shop Little Luxe Glow Jewellery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop All Jewellery | Little Luxe Glow",
    description: "Browse necklaces, earrings, rings, bangles and bridal sets from Little Luxe Glow with cash on delivery across Pakistan.",
    images: [`${site.url}/opengraph-image.png`],
  },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = readShopParams(await searchParams);
  const categories = await getCategories();
  const current = categories.find((c) => c.slug === params.category);

  return (
    <ShopView
      basePath="/shop"
      params={params}
      title={current?.name ?? "All jewellery"}
      description={current?.description ?? "Pieces chosen to catch the light, delivered across Pakistan."}
    />
  );
}
