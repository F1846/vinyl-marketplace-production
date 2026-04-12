import { Suspense } from "react";
import type { Metadata } from "next";
import { PayPalReturnClient } from "./paypal-return-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PayPalCheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; state?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={null}>
      <PayPalReturnClient token={params.token ?? null} state={params.state ?? null} />
    </Suspense>
  );
}
