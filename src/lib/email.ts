import { formatEuroFromCents } from "@/lib/money";
import { siteConfig, siteUrl } from "@/lib/site";
import type { OrderStatus, TrackingSummary } from "@/types/order";
import { OrderWithItems, type ShippingAddress } from "@/types/order";

type MailgunConfig = {
  apiKey: string;
  domain: string;
  baseUrl: string;
  from: string;
  bcc: string | null;
};

type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getMailgunConfig(): MailgunConfig {
  const apiKey = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || "Federico Shop DE";
  const bcc = process.env.EMAIL_BCC?.trim() || null;
  const baseUrl = process.env.MAILGUN_BASE_URL?.trim() || "https://api.mailgun.net";

  if (!apiKey) {
    throw new Error("MAILGUN_API_KEY is not configured");
  }

  if (!domain) {
    throw new Error("MAILGUN_DOMAIN is not configured");
  }

  return {
    apiKey,
    domain,
    baseUrl,
    from: from || `${fromName} <postmaster@${domain}>`,
    bcc,
  };
}

async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
}: TransactionalEmail) {
  const config = getMailgunConfig();
  const auth = Buffer.from(`api:${config.apiKey}`).toString("base64");
  const body = new URLSearchParams({
    from: config.from,
    to,
    subject,
    html,
    text,
  });
  if (config.bcc) {
    body.append("bcc", config.bcc);
  }

  const response = await fetch(`${config.baseUrl}/v3/${config.domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Mailgun error (${response.status}): ${await response.text()}`);
  }
}

function statusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Order received";
    case "processing":
      return "Order in progress";
    case "shipped":
      return "Order shipped";
    case "delivered":
      return "Order delivered";
    case "cancelled":
      return "Order cancelled";
    default:
      return "Order update";
  }
}

function statusMessage(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "We received your order and will review it shortly.";
    case "processing":
      return "Your order is being prepared now.";
    case "shipped":
      return "Your parcel is on the way.";
    case "delivered":
      return "Your parcel was marked as delivered.";
    case "cancelled":
      return "Your order was cancelled. If this was unexpected, reply to this email.";
    default:
      return "There is a new update on your order.";
  }
}

export async function sendOrderConfirmation(order: OrderWithItems) {
  const lineItems = order.items
    .map(
      (item) =>
        `${item.product.artist} - ${item.product.title} (${item.product.format}) x ${item.quantity} = ${formatEuroFromCents(item.priceAtPurchaseCents * item.quantity)}`
    )
    .join("\n");

  await sendTransactionalEmail({
    to: order.customerEmail,
    subject: `Order ${order.orderNumber} confirmed - ${siteConfig.name}`,
    html: buildOrderEmailHtml({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      lineItems,
      subtotal: formatEuroFromCents(order.subtotalCents),
      shipping: formatEuroFromCents(order.shippingCents),
      total: formatEuroFromCents(order.totalCents),
      address: formatAddress(order.shippingAddress),
      deliveryMethod: order.deliveryMethod,
    }),
    text: buildOrderEmailText({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      lineItems,
      subtotal: formatEuroFromCents(order.subtotalCents),
      shipping: formatEuroFromCents(order.shippingCents),
      total: formatEuroFromCents(order.totalCents),
      address: formatAddress(order.shippingAddress),
      deliveryMethod: order.deliveryMethod,
    }),
  });
}

export async function sendShippingNotification(
  order: OrderWithItems,
  trackingSummary?: TrackingSummary | null
) {
  await sendTransactionalEmail({
    to: order.customerEmail,
    subject: `Order ${order.orderNumber} shipped - ${siteConfig.name}`,
    html: buildShippingEmailHtml({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      trackingNumber: order.trackingNumber,
      trackingCarrier:
        trackingSummary?.carrierName ?? trackingSummary?.carrierSlug ?? order.trackingCarrier,
      trackingUrl: trackingSummary?.trackingUrl ?? null,
    }),
    text: buildShippingEmailText({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      trackingNumber: order.trackingNumber,
      trackingCarrier:
        trackingSummary?.carrierName ?? trackingSummary?.carrierSlug ?? order.trackingCarrier,
      trackingUrl: trackingSummary?.trackingUrl ?? null,
    }),
  });
}

export async function sendOrderStatusUpdate(
  order: OrderWithItems,
  options?: {
    previousStatus?: OrderStatus | null;
    trackingSummary?: TrackingSummary | null;
  }
) {
  const trackingSummary = options?.trackingSummary ?? null;
  const label = statusLabel(order.status);
  const message = statusMessage(order.status);
  const previousStatusLabel = options?.previousStatus ? statusLabel(options.previousStatus) : null;

  await sendTransactionalEmail({
    to: order.customerEmail,
    subject: `${label} - ${order.orderNumber} - ${siteConfig.name}`,
    html: buildStatusEmailHtml({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      statusLabel: label,
      message,
      previousStatusLabel,
      trackingCarrier:
        trackingSummary?.carrierName ?? trackingSummary?.carrierSlug ?? order.trackingCarrier,
      trackingNumber: order.trackingNumber,
      trackingUrl: trackingSummary?.trackingUrl ?? null,
    }),
    text: buildStatusEmailText({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      statusLabel: label,
      message,
      previousStatusLabel,
      trackingCarrier:
        trackingSummary?.carrierName ?? trackingSummary?.carrierSlug ?? order.trackingCarrier,
      trackingNumber: order.trackingNumber,
      trackingUrl: trackingSummary?.trackingUrl ?? null,
    }),
  });
}

export async function sendTestEmail(to: string) {
  await sendTransactionalEmail({
    to,
    subject: `Mail test - ${siteConfig.name}`,
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f3ef;padding:24px"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #dbd8d0;border-radius:24px;padding:24px"><h1 style="margin-top:0">${siteConfig.name}</h1><p>This is a live transactional email test.</p><p>If you received this, Mailgun is working for ${siteConfig.name}.</p><p><a href="${siteConfig.baseUrl}">${siteConfig.baseUrl}</a></p></div></body></html>`,
    text: `${siteConfig.name}\n\nThis is a live transactional email test.\nIf you received this, Mailgun is working for ${siteConfig.name}.\n\n${siteConfig.baseUrl}`,
  });
}

function buildOrderEmailHtml({
  orderNumber,
  customerName,
  lineItems,
  subtotal,
  shipping,
  total,
  address,
  deliveryMethod,
}: Record<string, string>): string {
  const deliveryLabel =
    deliveryMethod === "pickup" ? "Pickup details" : "Shipping address";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f3ef;color:#171717;margin:0;padding:0}
.container{max-width:620px;margin:24px auto;padding:28px;background:#ffffff;border-radius:24px;border:1px solid #dbd8d0}
h1{color:#171717;font-size:28px;font-family:Georgia,serif;margin:0 0 8px}
h2{font-size:16px;color:#171717;margin:20px 0 10px;text-transform:uppercase;letter-spacing:.18em}
.line-item{padding:12px 0;border-bottom:1px solid #ece8e0}
.totals{padding:12px 0;text-align:right;font-size:18px;font-weight:700}
.footer{margin-top:24px;font-size:12px;color:#6f6c66;text-align:center;border-top:1px solid #ece8e0;padding-top:16px}
a{color:#171717}
</style>
</head><body><div class="container">
  <h1>${siteConfig.name}</h1>
  <p>Thanks, ${customerName}.</p>
  <h2>Order ${orderNumber}</h2>
  <div class="line-item"><pre style="white-space:pre-wrap;font-size:14px">${lineItems}</pre></div>
  <div class="totals">Subtotal: ${subtotal}<br>Shipping: ${shipping}<br><strong>Total: ${total}</strong></div>
  <h2>${deliveryLabel}</h2>
  <pre style="white-space:pre-wrap;font-size:14px">${address}</pre>
  <div class="footer">Track your order: <a href="${siteUrl("/track-order")}">${siteUrl("/track-order")}</a></div>
</div></body></html>`;
}

function buildOrderEmailText({
  orderNumber,
  customerName,
  lineItems,
  subtotal,
  shipping,
  total,
  address,
  deliveryMethod,
}: Record<string, string>): string {
  const deliveryLabel =
    deliveryMethod === "pickup" ? "Pickup details" : "Shipping address";

  return [
    siteConfig.name,
    "",
    `Thanks, ${customerName}.`,
    "",
    `Order ${orderNumber}`,
    lineItems,
    "",
    `Subtotal: ${subtotal}`,
    `Shipping: ${shipping}`,
    `Total: ${total}`,
    "",
    `${deliveryLabel}:`,
    address,
    "",
    `Track your order: ${siteUrl("/track-order")}`,
  ].join("\n");
}

function buildShippingEmailHtml({
  orderNumber,
  customerName,
  trackingNumber,
  trackingCarrier,
  trackingUrl,
}: Record<string, string | null>): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<div style="max-width:600px;margin:24px auto;padding:24px;background:#ffffff;border-radius:24px;border:1px solid #dbd8d0;font-family:'Helvetica Neue',Arial,sans-serif;color:#171717">
<h1 style="font-family:Georgia,serif">${siteConfig.name}</h1>
<p>Thanks, ${customerName}.</p>
<h2>Order ${orderNumber} has shipped</h2>
<p><strong>${trackingCarrier}</strong>: <code>${trackingNumber}</code></p>
${trackingUrl ? `<p><a href="${trackingUrl}">Open tracking page</a></p>` : ""}
<div style="margin-top:20px;color:#6f6c66;font-size:12px"><p>Questions? Reply to this email.</p></div>
</div></body></html>`;
}

function buildShippingEmailText({
  orderNumber,
  customerName,
  trackingNumber,
  trackingCarrier,
  trackingUrl,
}: Record<string, string | null>): string {
  return [
    siteConfig.name,
    "",
    `Thanks, ${customerName}.`,
    `Order ${orderNumber} has shipped.`,
    `${trackingCarrier}: ${trackingNumber}`,
    trackingUrl ? `Tracking page: ${trackingUrl}` : null,
    "",
    "Questions? Reply to this email.",
  ].join("\n");
}

function buildStatusEmailHtml({
  orderNumber,
  customerName,
  statusLabel,
  message,
  previousStatusLabel,
  trackingCarrier,
  trackingNumber,
  trackingUrl,
}: Record<string, string | null>): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<div style="max-width:600px;margin:24px auto;padding:24px;background:#ffffff;border-radius:24px;border:1px solid #dbd8d0;font-family:'Helvetica Neue',Arial,sans-serif;color:#171717">
<h1 style="font-family:Georgia,serif">${siteConfig.name}</h1>
<p>Thanks, ${customerName}.</p>
<h2>${statusLabel}</h2>
<p>${message}</p>
${previousStatusLabel ? `<p>Previous status: <strong>${previousStatusLabel}</strong></p>` : ""}
<p>Order number: <strong>${orderNumber}</strong></p>
${
  trackingNumber
    ? `<p>${trackingCarrier || "Tracking"}: <code>${trackingNumber}</code></p>`
    : ""
}
${trackingUrl ? `<p><a href="${trackingUrl}">Open tracking page</a></p>` : ""}
<div style="margin-top:20px;color:#6f6c66;font-size:12px"><p>Track your order: <a href="${siteUrl("/track-order")}">${siteUrl("/track-order")}</a></p></div>
</div></body></html>`;
}

function buildStatusEmailText({
  orderNumber,
  customerName,
  statusLabel,
  message,
  previousStatusLabel,
  trackingCarrier,
  trackingNumber,
  trackingUrl,
}: Record<string, string | null>): string {
  return [
    siteConfig.name,
    "",
    `Thanks, ${customerName}.`,
    statusLabel,
    message,
    previousStatusLabel ? `Previous status: ${previousStatusLabel}` : null,
    `Order number: ${orderNumber}`,
    trackingNumber ? `${trackingCarrier || "Tracking"}: ${trackingNumber}` : null,
    trackingUrl ? `Tracking page: ${trackingUrl}` : null,
    `Track your order: ${siteUrl("/track-order")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatAddress(addr: ShippingAddress): string {
  if (addr.country === "PICKUP") {
    return [addr.pickupLocation ?? addr.line1, addr.pickupNote].filter(Boolean).join("\n");
  }

  const locality = [addr.postalCode, addr.city].filter(Boolean).join(" ");
  const stateLine = addr.state?.trim()
    ? [locality, addr.state.trim()].filter(Boolean).join(", ")
    : locality;

  return [
    addr.name,
    addr.email,
    addr.phoneNumber ?? addr.phone,
    addr.line1,
    addr.additionalInfo ?? addr.line2,
    stateLine,
    addr.country,
  ]
    .filter(Boolean)
    .join("\n");
}
