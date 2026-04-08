import "dotenv/config";
import { sendOrderConfirmation, sendOrderStatusUpdate } from "../src/lib/email";

async function main() {
  const recipient = process.argv[2]?.trim();

  if (!recipient) {
    throw new Error("Usage: npm run email:test-order-flow -- you@example.com");
  }

  const sampleOrder = {
    id: "test-order-1",
    orderNumber: "FS-TEST-EMAIL-001",
    customerEmail: recipient,
    customerName: "Federico Test",
    shippingAddress: {
      name: "Federico Test",
      line1: "Test Street 12",
      line2: "Apartment 3",
      city: "Berlin",
      state: "",
      postalCode: "10115",
      country: "DE",
      phone: "+49 123456789",
      email: recipient,
      phoneNumber: "+49 123456789",
    },
    subtotalCents: 2800,
    shippingCents: 600,
    taxCents: 0,
    totalCents: 3400,
    status: "processing" as const,
    paymentMethod: "paypal" as const,
    deliveryMethod: "shipping" as const,
    trackingNumber: "TEST123456789",
    trackingCarrier: "dhl",
    stripeSessionId: null,
    stripePaymentIntentId: null,
    paypalOrderId: "PAYPAL-TEST-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: "test-item-1",
        orderId: "test-order-1",
        productId: "product-1",
        quantity: 1,
        priceAtPurchaseCents: 2800,
        createdAt: new Date(),
        product: {
          artist: "Beta Evers",
          title: "Delusion",
          format: "vinyl",
          imageUrl: null,
        },
      },
    ],
  };

  await sendOrderConfirmation(sampleOrder);
  await sendOrderStatusUpdate(sampleOrder, {
    previousStatus: "pending",
    trackingSummary: {
      provider: "carrier",
      trackingNumber: "TEST123456789",
      carrierSlug: "dhl",
      carrierName: "DHL",
      carrierStatus: null,
      carrierStatusLabel: "Tracking link ready",
      message: "Open the carrier page to check the latest shipment scan.",
      trackingUrl:
        "https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=TEST123456789",
      lastUpdatedAt: null,
      checkpoints: [],
    },
  });

  console.log(`Sent test order emails to ${recipient}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
