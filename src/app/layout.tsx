import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "F1846 Vinyl — Records, Tapes & CDs",
    template: "%s | F1846 Vinyl",
  },
  description:
    "Buy vinyl records, cassette tapes, and CDs. Electronic music specialists — deep catalog cuts from a dedicated collector.",
  keywords: ["vinyl", "records", "cassettes", "CDs", "electronic music", "techno", "house", "trance"],
  openGraph: {
    title: "F1846 Vinyl",
    description: "Records, Tapes & CDs — Electronic music specialists",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <Header />
        <main className="container mx-auto flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
