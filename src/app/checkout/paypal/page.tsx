import { Suspense } from "react";
import { PayPalReturnClient } from "./paypal-return-client";

export const dynamic = "force-dynamic";

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
