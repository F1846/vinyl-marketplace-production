import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.vercel.app",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "i.discogs.com",
      },
      {
        protocol: "https",
        hostname: "img.discogs.com",
      },
    ],
  },
  output: "standalone",
  experimental: {},
  webpack: (config) => {
    config.resolve.alias["@/db"] = path.resolve(__dirname, "db/index.ts");
    config.resolve.alias["@/db/schema"] = path.resolve(__dirname, "db/schema.ts");
    return config;
  },
};

export default nextConfig;
