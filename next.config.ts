import type { NextConfig } from "next";
import path from "path";

// Content-Security-Policy that covers:
// - Self-hosted pages and API routes
// - Vercel Blob for product images
// - Discogs CDN for imported cover art
// - Stripe and PayPal for payment iframes / scripts
// - Vercel Speed Insights and Analytics
// Adjust src directives if new third-party integrations are added.
const CSP = [
  "default-src 'self'",
  // Scripts: Next.js inline chunks need 'unsafe-inline'; Stripe and PayPal load their own JS
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com",
  // Styles: Tailwind inlines critical CSS at runtime
  "style-src 'self' 'unsafe-inline'",
  // Images: self + Vercel Blob + Discogs CDN + data URIs for placeholders
  "img-src 'self' data: https://*.vercel.app https://*.public.blob.vercel-storage.com https://i.discogs.com https://img.discogs.com",
  // Fonts: self only (no Google Fonts)
  "font-src 'self'",
  // Frames: Stripe uses iframes for the card element
  "frame-src https://js.stripe.com https://hooks.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
  // Connections: API calls to Stripe, PayPal, and Vercel Insights
  "connect-src 'self' https://api.stripe.com https://api.paypal.com https://api-m.paypal.com https://api-m.sandbox.paypal.com https://vitals.vercel-insights.com",
  // Media, objects, workers: restrict to self
  "media-src 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  // Form actions: only allow posting to self (prevents cross-origin form hijacking)
  "form-action 'self'",
  // Prevent loading this page inside a frame from a different origin
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: CSP,
  },
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
