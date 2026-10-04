import type { Metadata } from "next";
import { ShopView } from "@/components/store/shop-view";
import { getCategories } from "@/lib/data/catalog";
import { readShopParams } from "@/lib/shop-params";

export const metadata: Metadata = {
  title: "Shop all jewellery",
  description: "Browse necklaces, earrings, rings, bangles and bridal sets from Glance of Gold.",
  alternates: { canonical: "/shop" },
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
