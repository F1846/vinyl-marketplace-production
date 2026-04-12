import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Track Your Order",
  description:
    "Track your Federico Shop order status, shipment updates, and carrier scans using your order number and checkout email.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TrackOrderLayout({ children }: { children: ReactNode }) {
  return children;
}
