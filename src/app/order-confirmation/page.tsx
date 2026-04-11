import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OrderConfirmationClient } from "./order-confirmation-client";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { createInvoiceToken } from "@/lib/invoice";

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; order_number?: string; payment?: string }>;
}) {
  const params = await searchParams;

  // Guard: no identifiers means the user landed here directly — send them to the catalog
  if (!params.session_id && !params.order_number) {
    redirect("/catalog");
  }

  let invoiceUrl: string | null = null;

  if (params.session_id) {
    // Stripe checkout: look up by Stripe session ID
    const order = await db().query.orders.findFirst({
      where: eq(schema.orders.stripeSessionId, params.session_id),
      columns: { id: true },
    });
    if (order) {
      invoiceUrl = `/api/orders/invoice?token=${encodeURIComponent(createInvoiceToken(order.id))}`;
    }
  } else if (params.order_number) {
    // PayPal / pickup checkout: look up by order number
    const order = await db().query.orders.findFirst({
      where: eq(schema.orders.orderNumber, params.order_number),
      columns: { id: true },
    });
    if (order) {
      invoiceUrl = `/api/orders/invoice?token=${encodeURIComponent(createInvoiceToken(order.id))}`;
    }
  }

  return (
    <Suspense fallback={null}>
      <OrderConfirmationClient
        sessionId={params.session_id ?? null}
        orderNumber={params.order_number ?? null}
        paymentMethod={params.payment ?? null}
        invoiceUrl={invoiceUrl}
      />
    </Suspense>
  );
}
