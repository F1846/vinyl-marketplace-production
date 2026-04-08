import { formatEuroFromCents } from "@/lib/money";
import { createInvoiceToken } from "@/lib/invoice";
import { pickupAddressLines, siteConfig, siteUrl } from "@/lib/site";
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
  const invoiceUrl = siteUrl(
    `/api/orders/invoice?token=${encodeURIComponent(createInvoiceToken(order.id))}`
  );
  const lineItems = order.items
    .map(
      (item) =>
        `${item.product.artist} - ${item.product.title} (${item.product.format}) x ${item.quantity} = ${formatEuroFromCents(item.priceAtPurchaseCents * item.quantity)}`
    )
    .join("\n");

  await sendTransactionalEmail({
    to: order.customerEmail,
    subject: buildCustomerEmailSubject(order.orderNumber, "Order confirmed"),
    html: buildOrderEmailHtml({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      lineItems,
      subtotal: formatEuroFromCents(order.subtotalCents),
      shipping: formatEuroFromCents(order.shippingCents),
      total: formatEuroFromCents(order.totalCents),
      address: formatAddress(order.shippingAddress),
      deliveryMethod: order.deliveryMethod,
      invoiceUrl,
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
      invoiceUrl,
    }),
  });
}

export async function sendShippingNotification(
  order: OrderWithItems,
  trackingSummary?: TrackingSummary | null
) {
  await sendTransactionalEmail({
    to: order.customerEmail,
    subject: buildCustomerEmailSubject(order.orderNumber, "Order shipped"),
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
    subject: buildCustomerEmailSubject(order.orderNumber, label),
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
    html: buildCustomerEmailHtmlShell({
      title: "Mail test",
      intro: `This is a live transactional email test for ${siteConfig.name}.`,
      orderNumber: null,
      bodyHtml: `<p class="body-copy">If you received this, Mailgun is working for ${siteConfig.name}.</p>`,
      footerHtml: `<p><a href="${siteConfig.baseUrl}">${siteConfig.baseUrl}</a></p>`,
    }),
    text: buildCustomerEmailTextShell({
      title: "Mail test",
      intro: `This is a live transactional email test for ${siteConfig.name}.`,
      orderNumber: null,
      bodyLines: [`If you received this, Mailgun is working for ${siteConfig.name}.`],
      footerLines: [siteConfig.baseUrl],
    }),
  });
}

function buildCustomerEmailSubject(orderNumber: string, label: string): string {
  return `${siteConfig.name} - ${orderNumber} - ${label}`;
}

function buildCustomerEmailHtmlShell({
  title,
  intro,
  orderNumber,
  bodyHtml,
  footerHtml,
}: {
  title: string;
  intro: string;
  orderNumber: string | null;
  bodyHtml: string;
  footerHtml: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f3ef;color:#171717;margin:0;padding:24px}
    .container{max-width:620px;margin:0 auto;padding:28px;background:#ffffff;border-radius:24px;border:1px solid #dbd8d0}
    .brand{margin:0 0 8px;color:#6f6c66;font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}
    h1{margin:0 0 10px;font-size:28px;line-height:1.05;font-weight:700;color:#171717}
    .intro{margin:0 0 18px;font-size:15px;line-height:1.7;color:#3d3a35}
    .order-chip{display:inline-block;margin:0 0 18px;padding:8px 14px;border:1px solid #dbd8d0;border-radius:999px;background:#faf8f2;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#6f6c66}
    .section{padding:16px 0;border-top:1px solid #ece8e0}
    .section:first-of-type{border-top:0;padding-top:0}
    .section h2{margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#6f6c66}
    .body-copy{margin:0;font-size:14px;line-height:1.7;color:#3d3a35}
    .body-pre{margin:0;white-space:pre-wrap;font-size:14px;line-height:1.7;color:#3d3a35;font-family:'Helvetica Neue',Arial,sans-serif}
    .totals{font-size:15px;line-height:1.8;color:#171717}
    .totals strong{font-weight:700}
    .footer{margin-top:24px;padding-top:16px;border-top:1px solid #ece8e0;font-size:12px;line-height:1.8;color:#6f6c66}
    a{color:#171717}
  </style>
</head>
<body>
  <div class="container">
    <p class="brand">${siteConfig.name}</p>
    <h1>${title}</h1>
    <p class="intro">${intro}</p>
    ${orderNumber ? `<div class="order-chip">${orderNumber}</div>` : ""}
    ${bodyHtml}
    <div class="footer">${footerHtml}</div>
  </div>
</body>
</html>`;
}

function buildCustomerEmailTextShell({
  title,
  intro,
  orderNumber,
  bodyLines,
  footerLines,
}: {
  title: string;
  intro: string;
  orderNumber: string | null;
  bodyLines: string[];
  footerLines: string[];
}): string {
  return [
    siteConfig.name,
    "",
    title,
    intro,
    orderNumber ? `Order: ${orderNumber}` : null,
    "",
    ...bodyLines,
    "",
    ...footerLines,
  ]
    .filter(Boolean)
    .join("\n");
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
  invoiceUrl,
}: Record<string, string>): string {
  const deliveryLabel =
    deliveryMethod === "pickup" ? "Pickup details" : "Shipping address";

  return buildCustomerEmailHtmlShell({
    title: "Order confirmed",
    intro: `Thanks, ${customerName}. Your order is confirmed.`,
    orderNumber,
    bodyHtml: `
      <div class="section">
        <h2>Items</h2>
        <pre class="body-pre">${lineItems}</pre>
      </div>
      <div class="section">
        <h2>Totals</h2>
        <div class="totals">Subtotal: ${subtotal}<br>Shipping: ${shipping}<br><strong>Total: ${total}</strong></div>
      </div>
      <div class="section">
        <h2>${deliveryLabel}</h2>
        <pre class="body-pre">${address}</pre>
      </div>
    `,
    footerHtml: `
      <p>Track your order: <a href="${siteUrl("/track-order")}">${siteUrl("/track-order")}</a></p>
      <p>Download invoice: <a href="${invoiceUrl}">${invoiceUrl}</a></p>
    `,
  });
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
  invoiceUrl,
}: Record<string, string>): string {
  const deliveryLabel =
    deliveryMethod === "pickup" ? "Pickup details" : "Shipping address";

  return buildCustomerEmailTextShell({
    title: "Order confirmed",
    intro: `Thanks, ${customerName}. Your order is confirmed.`,
    orderNumber,
    bodyLines: [
      "Items:",
      lineItems,
      "",
      `Subtotal: ${subtotal}`,
      `Shipping: ${shipping}`,
      `Total: ${total}`,
      "",
      `${deliveryLabel}:`,
      address,
    ],
    footerLines: [
      `Download invoice: ${invoiceUrl}`,
      `Track your order: ${siteUrl("/track-order")}`,
    ],
  });
}

function buildShippingEmailHtml({
  orderNumber,
  customerName,
  trackingNumber,
  trackingCarrier,
  trackingUrl,
}: Record<string, string | null>): string {
  return buildCustomerEmailHtmlShell({
    title: "Order shipped",
    intro: `Thanks, ${customerName}. Your parcel is on the way.`,
    orderNumber,
    bodyHtml: `
      <div class="section">
        <h2>Tracking</h2>
        <p class="body-copy"><strong>${trackingCarrier}</strong>: <code>${trackingNumber}</code></p>
        ${trackingUrl ? `<p class="body-copy"><a href="${trackingUrl}">Open tracking page</a></p>` : ""}
      </div>
    `,
    footerHtml: `
      <p>Track your order: <a href="${siteUrl("/track-order")}">${siteUrl("/track-order")}</a></p>
      <p>Questions? Reply to this email.</p>
    `,
  });
}

function buildShippingEmailText({
  orderNumber,
  customerName,
  trackingNumber,
  trackingCarrier,
  trackingUrl,
}: Record<string, string | null>): string {
  return buildCustomerEmailTextShell({
    title: "Order shipped",
    intro: `Thanks, ${customerName}. Your parcel is on the way.`,
    orderNumber,
    bodyLines: [
      "Tracking:",
      `${trackingCarrier}: ${trackingNumber}`,
      trackingUrl ? `Tracking page: ${trackingUrl}` : null,
    ].filter((line): line is string => Boolean(line)),
    footerLines: [
      `Track your order: ${siteUrl("/track-order")}`,
      "Questions? Reply to this email.",
    ],
  });
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
  return buildCustomerEmailHtmlShell({
    title: statusLabel ?? "Order update",
    intro: `Thanks, ${customerName}. There is a new update on your order.`,
    orderNumber,
    bodyHtml: `
      <div class="section">
        <h2>Status</h2>
        <p class="body-copy">${message}</p>
        ${previousStatusLabel ? `<p class="body-copy">Previous status: <strong>${previousStatusLabel}</strong></p>` : ""}
      </div>
      ${
        trackingNumber
          ? `<div class="section">
              <h2>Tracking</h2>
              <p class="body-copy">${trackingCarrier || "Tracking"}: <code>${trackingNumber}</code></p>
              ${trackingUrl ? `<p class="body-copy"><a href="${trackingUrl}">Open tracking page</a></p>` : ""}
            </div>`
          : ""
      }
    `,
    footerHtml: `
      <p>Track your order: <a href="${siteUrl("/track-order")}">${siteUrl("/track-order")}</a></p>
    `,
  });
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
  return buildCustomerEmailTextShell({
    title: statusLabel ?? "Order update",
    intro: `Thanks, ${customerName}. There is a new update on your order.`,
    orderNumber,
    bodyLines: [
      message,
      previousStatusLabel ? `Previous status: ${previousStatusLabel}` : null,
      trackingNumber ? `${trackingCarrier || "Tracking"}: ${trackingNumber}` : null,
      trackingUrl ? `Tracking page: ${trackingUrl}` : null,
    ].filter((line): line is string => Boolean(line)),
    footerLines: [`Track your order: ${siteUrl("/track-order")}`],
  });
}

function formatAddress(addr: ShippingAddress): string {
  if (addr.country === "PICKUP") {
    return pickupAddressLines().join("\n");
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
