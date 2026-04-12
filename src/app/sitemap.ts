import type { MetadataRoute } from "next";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  buildCatalogUrl,
  catalogFormatCollections,
  catalogGenreCollections,
  siteUrl,
} from "@/lib/site";
import { seoLandingPages } from "@/lib/seo-landing-pages";

export const revalidate = 3600;

async function getActiveProducts() {
  try {
    return await db().query.products.findMany({
      where: and(
        eq(schema.products.status, "active"),
        gt(schema.products.stockQuantity, 0),
        isNull(schema.products.deletedAt)
      ),
      columns: {
        id: true,
        updatedAt: true,
      },
      with: {
        images: {
          columns: { url: true },
          orderBy: [schema.productImages.sortOrder],
          limit: 5,
        },
      },
    });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Database unavailable during build.";
    console.warn(
      `Sitemap product URLs were skipped because the database is unavailable during build. ${reason}`,
    );
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    { path: "", changeFrequency: "daily" as const, priority: 1 },
    { path: "/catalog", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/about", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/contact", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/shipping", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/privacy", changeFrequency: "monthly" as const, priority: 0.4 },
    { path: "/terms", changeFrequency: "monthly" as const, priority: 0.4 },
    { path: "/refund", changeFrequency: "monthly" as const, priority: 0.4 },
    { path: "/imprint", changeFrequency: "monthly" as const, priority: 0.4 },
  ];
  const collectionRoutes = [
    ...catalogFormatCollections.map((collection) => ({
      url: buildCatalogUrl({ format: collection.format }),
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
    ...catalogGenreCollections.map((collection) => ({
      url: buildCatalogUrl({ genre: collection.genre }),
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
  ];
  const landingRoutes = seoLandingPages.map((page) => ({
    url: siteUrl(`/${page.slug}`),
    changeFrequency: "weekly" as const,
    priority: page.kind === "pickup" ? 0.66 : 0.68,
  }));
  const products = await getActiveProducts();

  return [
    ...staticRoutes.map((route) => ({
      url: siteUrl(route.path),
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...collectionRoutes.map((route) => ({
      url: route.url,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...landingRoutes.map((route) => ({
      url: route.url,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...products.map((product) => ({
      url: siteUrl(`/products/${product.id}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(product.images.length > 0 && {
        images: product.images.map((img) => img.url),
      }),
    })),
  ];
}
