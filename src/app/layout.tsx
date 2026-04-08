import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: "Federico Shop | Records, Tapes & CDs",
    template: "%s | Federico Shop",
  },
  metadataBase: new URL(siteConfig.baseUrl),
  description: siteConfig.description,
  keywords: ["vinyl", "records", "cassettes", "CDs", "electronic music", "techno", "house", "trance"],
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    type: "website",
    url: siteConfig.baseUrl,
  },
  alternates: {
    canonical: siteConfig.baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <Header />
        <main className="container mx-auto flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        <Footer />
        <SpeedInsights />
      </body>
    </html>
  );
}
