import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Track Your Order",
  description:
    "Track your Federico Shop order status, shipment updates, and carrier scans using your order number and checkout email.",
  keywords: [
    "track Federico Shop order",
    "Federico Shop order status",
    "Federico Shop tracking",
    "order lookup Federico Shop",
  ],
  alternates: {
    canonical: siteUrl("/track-order"),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function TrackOrderLayout({ children }: { children: ReactNode }) {
  return children;
}
