import { createHmac, timingSafeEqual } from "crypto";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatEuroFromCents } from "@/lib/money";
import { legalAddressLines, siteConfig } from "@/lib/site";
import type { OrderWithItems, ShippingAddress } from "@/types/order";

const DEFAULT_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function getInvoiceSecret(): string {
  const secret =
    process.env.INVOICE_DOWNLOAD_SECRET?.trim() ||
    process.env.CHECKOUT_STATE_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error("Invoice signing secret is not configured");
  }

  return secret;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatInvoiceDate(value: Date): string {
  return value.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatAddressLines(address: ShippingAddress): string[] {
  if (address.country === "PICKUP") {
    return [
      address.name,
      address.email ?? "",
      address.phoneNumber ?? address.phone ?? "",
      address.pickupLocation ?? address.line1,
      address.pickupNote ?? "",
    ].filter(Boolean);
  }

  const locality = [address.postalCode, address.city].filter(Boolean).join(" ");
  const stateLine = address.state?.trim()
    ? [locality, address.state.trim()].filter(Boolean).join(", ")
    : locality;

  return [
    address.name,
    address.email ?? "",
    address.phoneNumber ?? address.phone ?? "",
    address.line1,
    address.additionalInfo ?? address.line2 ?? "",
    stateLine,
    address.country,
  ].filter(Boolean);
}

function paymentMethodLabel(method: OrderWithItems["paymentMethod"]): string {
  switch (method) {
    case "card":
      return "Credit or debit card";
    case "paypal":
      return "PayPal";
    case "pickup":
      return "Berlin local pickup";
    default:
      return method;
  }
}

function deliveryMethodLabel(method: OrderWithItems["deliveryMethod"]): string {
  return method === "pickup" ? "Berlin local pickup" : "Shipping";
}

export function createInvoiceToken(orderId: string, ttlMs = DEFAULT_TOKEN_TTL_MS): string {
  const payload = encodeBase64Url(
    JSON.stringify({
      orderId,
      exp: Date.now() + ttlMs,
    })
  );
  const signature = signValue(payload, getInvoiceSecret());
  return `${payload}.${signature}`;
}

export function verifyInvoiceToken(token: string): { orderId: string } | null {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signValue(payload, getInvoiceSecret());
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as {
      orderId?: string;
      exp?: number;
    };

    if (!parsed.orderId || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }

    return { orderId: parsed.orderId };
  } catch {
    return null;
  }
}

export async function getOrderWithItemsById(orderId: string): Promise<OrderWithItems | null> {
  const order = await db().query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
    with: {
      items: {
        with: {
          product: {
            columns: {
              artist: true,
              title: true,
              format: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  return {
    ...order,
    shippingAddress: order.shippingAddress as ShippingAddress,
    items: order.items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        imageUrl: null,
      },
    })),
  };
}

export async function getOrderWithItemsByLookup(
  orderNumber: string,
  email: string
): Promise<OrderWithItems | null> {
  const order = await db().query.orders.findFirst({
    where: and(
      eq(schema.orders.orderNumber, orderNumber),
      eq(schema.orders.customerEmail, email)
    ),
    with: {
      items: {
        with: {
          product: {
            columns: {
              artist: true,
              title: true,
              format: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  return {
    ...order,
    shippingAddress: order.shippingAddress as ShippingAddress,
    items: order.items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        imageUrl: null,
      },
    })),
  };
}

export function buildInvoiceFilename(orderNumber: string): string {
  return `invoice-${orderNumber.toLowerCase()}.html`;
}

export function buildInvoiceHtml(order: OrderWithItems): string {
  const storeLines = legalAddressLines();
  const customerLines = formatAddressLines(order.shippingAddress);
  const rows = order.items
    .map((item) => {
      const label = `${item.product.artist} - ${item.product.title}`;
      const lineTotal = formatEuroFromCents(item.priceAtPurchaseCents * item.quantity);

      return `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td>${escapeHtml(item.product.format.toUpperCase())}</td>
          <td>${item.quantity}</td>
          <td>${escapeHtml(formatEuroFromCents(item.priceAtPurchaseCents))}</td>
          <td>${escapeHtml(lineTotal)}</td>
        </tr>`;
    })
    .join("");

  const customerSection = customerLines
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
  const storeSection = storeLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  const vatLine = siteConfig.legal.vatId
    ? `<div>VAT ID: ${escapeHtml(siteConfig.legal.vatId)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${escapeHtml(order.orderNumber)} - ${escapeHtml(siteConfig.name)}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 32px;
      background: #f5f4ef;
      color: #171717;
      font-family: "Helvetica Neue", Arial, sans-serif;
    }
    .sheet {
      max-width: 920px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #dedbd2;
      border-radius: 28px;
      padding: 36px;
      box-shadow: 0 30px 80px rgba(17, 17, 17, 0.08);
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      margin-bottom: 28px;
    }
    .eyebrow {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #6f6c66;
    }
    h1 {
      margin: 0;
      font-size: 38px;
      line-height: 0.95;
      letter-spacing: -0.04em;
      font-weight: 700;
    }
    .meta {
      display: grid;
      gap: 6px;
      text-align: right;
      font-size: 14px;
      color: #4b4a46;
    }
    .grid {
      display: grid;
      gap: 20px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 28px 0;
    }
    .panel {
      border: 1px solid #e7e3d9;
      border-radius: 20px;
      padding: 18px 20px;
      background: #fbfaf6;
    }
    .panel h2 {
      margin: 0 0 12px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #6f6c66;
    }
    .panel div {
      margin: 4px 0;
      font-size: 14px;
      line-height: 1.6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    th, td {
      padding: 14px 10px;
      border-bottom: 1px solid #ece8de;
      text-align: left;
      vertical-align: top;
      font-size: 14px;
    }
    th {
      color: #6f6c66;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }
    .totals {
      margin-top: 20px;
      margin-left: auto;
      width: min(320px, 100%);
      border: 1px solid #e7e3d9;
      border-radius: 20px;
      padding: 18px 20px;
      background: #fbfaf6;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin: 8px 0;
      font-size: 15px;
    }
    .totals-row.total {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #ddd6c9;
      font-size: 20px;
      font-weight: 700;
    }
    .note {
      margin-top: 24px;
      font-size: 13px;
      color: #6f6c66;
      line-height: 1.7;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .sheet { box-shadow: none; border: none; border-radius: 0; padding: 0; }
    }
    @media (max-width: 720px) {
      body { padding: 16px; }
      .sheet { padding: 22px; border-radius: 22px; }
      .topbar { flex-direction: column; }
      .meta { text-align: left; }
      .grid { grid-template-columns: 1fr; }
      th:nth-child(2), td:nth-child(2) { display: none; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="topbar">
      <div>
        <p class="eyebrow">Federico Shop</p>
        <h1>Invoice</h1>
      </div>
      <div class="meta">
        <div><strong>${escapeHtml(order.orderNumber)}</strong></div>
        <div>Date: ${escapeHtml(formatInvoiceDate(order.createdAt))}</div>
        <div>Payment: ${escapeHtml(paymentMethodLabel(order.paymentMethod))}</div>
        <div>Delivery: ${escapeHtml(deliveryMethodLabel(order.deliveryMethod))}</div>
      </div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>From</h2>
        ${storeSection}
        ${vatLine}
        <div>${escapeHtml(siteConfig.supportEmail)}</div>
      </div>
      <div class="panel">
        <h2>Bill to</h2>
        ${customerSection}
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Format</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Line total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <section class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <strong>${escapeHtml(formatEuroFromCents(order.subtotalCents))}</strong>
      </div>
      <div class="totals-row">
        <span>Shipping</span>
        <strong>${escapeHtml(formatEuroFromCents(order.shippingCents))}</strong>
      </div>
      <div class="totals-row">
        <span>Tax</span>
        <strong>${escapeHtml(formatEuroFromCents(order.taxCents))}</strong>
      </div>
      <div class="totals-row total">
        <span>Total</span>
        <strong>${escapeHtml(formatEuroFromCents(order.totalCents))}</strong>
      </div>
    </section>

    <p class="note">
      Thank you for your order. If you need help with this invoice, contact
      ${escapeHtml(siteConfig.supportEmail)}.
    </p>
  </main>
</body>
</html>`;
}
