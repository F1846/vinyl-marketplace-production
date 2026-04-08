import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const host = new URL(siteConfig.baseUrl).host;

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/catalog", "/products/", "/about", "/contact", "/shipping"],
        disallow: ["/admin", "/api", "/cart", "/checkout", "/order-confirmation"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/catalog", "/products/", "/about", "/contact", "/shipping"],
        disallow: ["/admin", "/api", "/cart", "/checkout", "/order-confirmation"],
      },
    ],
    sitemap: `${siteConfig.baseUrl}/sitemap.xml`,
    host,
  };
}
