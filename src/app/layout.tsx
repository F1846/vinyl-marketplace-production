import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Manrope } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "@/styles/globals.css";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { JsonLd } from "@/components/seo/json-ld";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getRequestLocale } from "@/lib/i18n/server";
import {
  buildCatalogUrl,
  catalogFormatCollections,
  catalogGenreCollections,
  siteConfig,
  siteUrl,
} from "@/lib/site";

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

const googleTagId = "AW-18075366550";

export const metadata: Metadata = {
  title: {
    default: "Federico Shop | Berlin-Based Online Record Shop for Vinyl, Tapes & CDs",
    template: "%s | Federico Shop",
  },
  metadataBase: new URL(siteConfig.baseUrl),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: siteConfig.faviconPath, type: "image/png", sizes: "512x512" },
      { url: siteConfig.faviconSvgPath, type: "image/svg+xml", sizes: "any" },
      { url: "/icon", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: siteConfig.faviconPath, type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: siteConfig.seoKeywords,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "music store",
  openGraph: {
    title: "Federico Shop | Berlin-Based Online Record Shop",
    description: siteConfig.description,
    type: "website",
    url: siteConfig.baseUrl,
    siteName: siteConfig.name,
    images: [
      {
        url: siteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "Federico Shop - Berlin-based online record shop",
      },
    ],
  },
  alternates: {
    canonical: siteConfig.baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Federico Shop | Berlin-Based Online Record Shop",
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
    "@id": `${siteConfig.baseUrl}#website`,
    name: siteConfig.name,
    url: siteConfig.baseUrl,
    description: siteConfig.description,
    inLanguage: ["en", "de", "it"],
    publisher: {
      "@id": `${siteConfig.baseUrl}#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.baseUrl}/catalog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.baseUrl}#organization`,
    name: siteConfig.name,
    alternateName: siteConfig.brandAliases,
    url: siteConfig.baseUrl,
    image: siteUrl("/opengraph-image"),
    logo: {
      "@type": "ImageObject",
      url: siteUrl("/icon"),
      contentUrl: siteUrl("/icon"),
      width: 512,
      height: 512,
      caption: siteConfig.name,
    },
    email: siteConfig.supportEmail,
    sameAs: [siteConfig.discogsUrl],
    knowsAbout: siteConfig.seoKeywords,
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: siteConfig.supportEmail,
        contactType: "customer support",
        areaServed: ["DE", "EU"],
        availableLanguage: ["en", "de", "it"],
      },
      {
        "@type": "ContactPoint",
        email: siteConfig.orderEmail,
        contactType: "sales",
        areaServed: ["DE", "EU"],
        availableLanguage: ["en", "de", "it"],
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "MusicStore",
    "@id": `${siteConfig.baseUrl}#store`,
    name: siteConfig.name,
    alternateName: siteConfig.brandAliases,
    url: siteConfig.baseUrl,
    image: siteUrl("/opengraph-image"),
    logo: {
      "@type": "ImageObject",
      url: siteUrl("/icon"),
      contentUrl: siteUrl("/icon"),
      width: 512,
      height: 512,
      caption: siteConfig.name,
    },
    description: siteConfig.description,
    email: siteConfig.supportEmail,
    telephone: siteConfig.legal.phone ?? undefined,
    paymentAccepted: ["PayPal", "Credit Card", "Local Pickup"],
    priceRange: "EUR",
    areaServed: ["Germany", "Europe"],
    sameAs: [siteConfig.discogsUrl],
    knowsAbout: siteConfig.seoKeywords,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Federico Shop catalog collections",
      itemListElement: [
        ...catalogFormatCollections.map((collection) => ({
          "@type": "OfferCatalog",
          name: collection.label,
          url: buildCatalogUrl({ format: collection.format }),
        })),
        ...catalogGenreCollections.map((collection) => ({
          "@type": "OfferCatalog",
          name: collection.label,
          url: buildCatalogUrl({ genre: collection.genre }),
        })),
      ],
    },
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

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale}>
      <body
        className={`${sansFont.variable} ${serifFont.variable} flex min-h-screen flex-col bg-background font-sans text-foreground antialiased`}
      >
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`}
          strategy="afterInteractive"
        />
        <Script id="google-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleTagId}');
          `}
        </Script>

        <LocaleProvider locale={locale} dictionary={dictionary}>
          <JsonLd data={websiteStructuredData} />
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
