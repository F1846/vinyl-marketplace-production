import { Suspense } from "react";
import { OrderConfirmationClient } from "./order-confirmation-client";

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; order_number?: string; payment?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={null}>
      <OrderConfirmationClient
        sessionId={params.session_id ?? null}
        orderNumber={params.order_number ?? null}
        paymentMethod={params.payment ?? null}
      />
    </Suspense>
  );
}
