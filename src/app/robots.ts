import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const host = new URL(siteConfig.baseUrl).host;

  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/admin", "/api", "/cart", "/checkout", "/order-confirmation"],
      },
    ],
    sitemap: `${siteConfig.baseUrl}/sitemap.xml`,
    host,
  };
}
