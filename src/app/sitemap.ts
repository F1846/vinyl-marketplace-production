import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

async function getActiveProducts() {
  try {
    return await db().query.products.findMany({
      where: eq(schema.products.status, "active"),
      columns: {
        id: true,
        updatedAt: true,
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

  const products = await getActiveProducts();

  return [
    ...staticRoutes.map((route) => ({
      url: siteUrl(route.path),
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...products.map((product) => ({
      url: siteUrl(`/products/${product.id}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
