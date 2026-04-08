import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const noIndexHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive",
  },
];

const noStoreHeaders = [
  {
    key: "Cache-Control",
    value: "no-store",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(__dirname),
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
  async redirects() {
    return [
      {
        source: "/techno-vinyl",
        destination: "/catalog?genre=Techno&format=vinyl",
        permanent: true,
      },
      {
        source: "/darkwave-records",
        destination: "/catalog?genre=Darkwave",
        permanent: true,
      },
      {
        source: "/ebm-records",
        destination: "/catalog?genre=EBM",
        permanent: true,
      },
      {
        source: "/electro-vinyl",
        destination: "/catalog?genre=Electro&format=vinyl",
        permanent: true,
      },
      {
        source: "/ambient-records",
        destination: "/catalog?genre=Ambient",
        permanent: true,
      },
      {
        source: "/berlin-local-pickup",
        destination: "/shipping",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/admin/:path*",
        headers: [
          ...securityHeaders,
          ...noIndexHeaders,
          ...noStoreHeaders,
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          ...noIndexHeaders,
          ...noStoreHeaders,
        ],
      },
      {
        source: "/cart",
        headers: [...securityHeaders, ...noIndexHeaders, ...noStoreHeaders],
      },
      {
        source: "/checkout/:path*",
        headers: [...securityHeaders, ...noIndexHeaders, ...noStoreHeaders],
      },
      {
        source: "/order-confirmation/:path*",
        headers: [...securityHeaders, ...noIndexHeaders, ...noStoreHeaders],
      },
      {
        source: "/track-order/:path*",
        headers: securityHeaders,
      },
      {
        source: "/track-order",
        headers: securityHeaders,
      },
      {
        source: "/order-confirmation",
        headers: [...securityHeaders, ...noIndexHeaders, ...noStoreHeaders],
      },
      {
        source: "/checkout",
        headers: [...securityHeaders, ...noIndexHeaders, ...noStoreHeaders],
      },
      {
        source: "/cart/:path*",
        headers: [
          ...securityHeaders,
          ...noIndexHeaders,
          ...noStoreHeaders,
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias["@/db"] = path.resolve(__dirname, "db/index.ts");
    config.resolve.alias["@/db/schema"] = path.resolve(__dirname, "db/schema.ts");
    return config;
  },
};

export default nextConfig;
