import type { MetadataRoute } from "next";
import { getAllProductSlugs, getCategories } from "@/lib/data/catalog";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getAllProductSlugs(), getCategories()]);

  const staticPages = ["", "/shop", "/about", "/contact", "/faq", "/shipping", "/returns-exchange", "/terms", "/privacy", "/track"];

  return [
    ...staticPages.map((path) => ({
      url: `${site.url}${path}`,
      changeFrequency: path === "" ? ("daily" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.6,
    })),
    ...categories.map((c) => ({
      url: `${site.url}/collections/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${site.url}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
