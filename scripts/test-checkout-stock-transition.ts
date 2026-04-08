import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

dotenv.config({ path: ".env.local" });
dotenv.config();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const d = db();
  const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3107";
  const suffix = Date.now().toString();
  const productId = crypto.randomUUID();
  let createdOrderId: string | null = null;

  try {
    await d.insert(schema.products).values({
      id: productId,
      artist: `Codex Checkout ${suffix}`,
      title: "Stock Transition Product",
      format: "vinyl",
      genre: "Techno",
      priceCents: 2600,
      stockQuantity: 1,
      conditionMedia: "NM",
      conditionSleeve: "NM",
      description: "Temporary checkout stock transition test product.",
      status: "active",
      version: 1,
    });

    const response = await fetch(`${baseUrl}/api/checkout/pickup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ id: productId, qty: 1, price: 2600 }],
        customerName: "Codex Checkout Test",
        customerEmail: "fededoglio95@gmail.com",
        note: "Temporary stock transition test",
      }),
    });

    const payload = await response.json();
    assert(response.ok, `Pickup checkout should succeed. Received ${response.status}: ${JSON.stringify(payload)}`);
    assert(typeof payload.orderNumber === "string" && payload.orderNumber.length > 0, "Pickup checkout should return an order number.");

    const product = await d.query.products.findFirst({
      where: eq(schema.products.id, productId),
    });
    assert(product?.status === "sold_out", "Checkout should mark stock-0 products as sold_out.");
    assert(product.stockQuantity === 0, "Checkout should reduce stock to 0.");

    const order = await d.query.orders.findFirst({
      where: eq(schema.orders.orderNumber, payload.orderNumber),
    });
    assert(order, "Checkout should create an order record.");
    createdOrderId = order.id;

    console.log("checkout stock transition passed");
  } finally {
    if (createdOrderId) {
      await d.delete(schema.orderItems).where(eq(schema.orderItems.orderId, createdOrderId));
      await d.delete(schema.orders).where(eq(schema.orders.id, createdOrderId));
    }

    await d.delete(schema.products).where(eq(schema.products.id, productId));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
