import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Manrope } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getRequestLocale } from "@/lib/i18n/server";
import { siteConfig, siteUrl } from "@/lib/site";

const sansFont = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serifFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Federico Shop | Berlin Electronic Music Vinyl, Cassettes & CDs",
    template: "%s | Federico Shop",
  },
  metadataBase: new URL(siteConfig.baseUrl),
  manifest: "/manifest.webmanifest",
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "Federico Shop",
    "Federico Shop Berlin",
    "vinyl records",
    "electronic music record shop",
    "Berlin record shop",
    "Berlin vinyl store",
    "techno vinyl",
    "EBM vinyl",
    "darkwave vinyl",
    "post-punk records",
    "house records",
    "cassettes",
    "CDs",
    "used vinyl online",
  ],
  authors: [{ name: siteConfig.name }],
  category: "music store",
  openGraph: {
    title: "Federico Shop | Berlin Electronic Music Record Shop",
    description: siteConfig.description,
    type: "website",
    url: siteConfig.baseUrl,
    siteName: siteConfig.name,
    images: [
      {
        url: siteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "Federico Shop - Berlin electronic music record shop",
      },
    ],
  },
  alternates: {
    canonical: siteConfig.baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Federico Shop | Berlin Electronic Music Record Shop",
    description: siteConfig.description,
    images: [siteUrl("/twitter-image")],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

const websiteStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.baseUrl,
    description: siteConfig.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.baseUrl}/catalog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.baseUrl,
    email: siteConfig.supportEmail,
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: siteConfig.supportEmail,
        contactType: "customer support",
        areaServed: ["DE", "EU"],
        availableLanguage: ["en", "de", "it"],
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "MusicStore",
    name: siteConfig.name,
    url: siteConfig.baseUrl,
    image: siteUrl("/opengraph-image"),
    description: siteConfig.description,
    email: siteConfig.supportEmail,
    telephone: siteConfig.legal.phone ?? undefined,
    paymentAccepted: ["PayPal", "Credit Card", "Local Pickup"],
    priceRange: "EUR",
    areaServed: ["Germany", "Europe"],
    address: {
      "@type": "PostalAddress",
      streetAddress: [siteConfig.legal.street, siteConfig.legal.street2]
        .filter(Boolean)
        .join(", "),
      addressLocality: siteConfig.legal.city,
      postalCode: siteConfig.legal.postalCode,
      addressCountry: siteConfig.legal.country,
    },
  },
];

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale}>
      <body
        className={`${sansFont.variable} ${serifFont.variable} flex min-h-screen flex-col bg-background font-sans text-foreground antialiased`}
      >
        <LocaleProvider locale={locale} dictionary={dictionary}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
          />
          <Header />
          <main className="container mx-auto flex-1 px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            {children}
          </main>
          <Footer />
          <SpeedInsights />
        </LocaleProvider>
      </body>
    </html>
  );
}
