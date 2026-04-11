import { formatEuroFromCents } from "@/lib/money";
import { createInvoiceToken } from "@/lib/invoice";
import {
  pickupAddressCoreLines,
  siteConfig,
  siteUrl,
} from "@/lib/site";
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
  from?: string | null;
  replyTo?: string | null;
};

export type CustomerEmailSender = "orders" | "support";

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
  from,
  replyTo,
}: TransactionalEmail) {
  const config = getMailgunConfig();
  const auth = Buffer.from(`api:${config.apiKey}`).toString("base64");
  const body = new URLSearchParams({
    from: from?.trim() || config.from,
    to,
    subject,
    html,
    text,
  });
  if (config.bcc) {
    body.append("bcc", config.bcc);
  }
  if (replyTo?.trim()) {
    body.append("h:Reply-To", replyTo.trim());
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
  const itemsHtml = buildOrderItemsHtml(order.items);
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
      itemsHtml,
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

  await sendTransactionalEmail({
    to: order.customerEmail,
    subject: buildCustomerEmailSubject(order.orderNumber, label),
    html: buildStatusEmailHtml({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      statusLabel: label,
      message,
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

export async function sendManualOrderMessage(
  order: OrderWithItems,
  input: {
    sender: CustomerEmailSender;
    subject: string;
    message: string;
  }
) {
  const subject =
    input.subject.trim() || buildCustomerEmailSubject(order.orderNumber, "Order update");
  const messageText = formatPlainTextBlock(input.message);
  const replyAddress = senderEmailAddress(input.sender);
  const manualFooterLines = [
    `Reply to this email or write to ${replyAddress}.`,
    ...(order.deliveryMethod === "shipping"
      ? [
          order.trackingNumber ? `Tracking number: ${order.trackingNumber}` : null,
          `Track your order: ${siteUrl("/track-order")}`,
        ]
      : ["We will confirm local pickup details by email."]),
  ].filter((line): line is string => Boolean(line));
  const manualFooterHtml = [
    `<p>Reply to this email or write to <a href="mailto:${replyAddress}">${replyAddress}</a>.</p>`,
    ...(order.deliveryMethod === "shipping"
      ? [
          order.trackingNumber
            ? `<p>Tracking number: <code>${escapeHtml(order.trackingNumber)}</code></p>`
            : null,
          `<p>Track your order: <a href="${siteUrl("/track-order")}">${siteUrl("/track-order")}</a></p>`,
        ]
      : ["<p>We will confirm local pickup details by email.</p>"]),
  ]
    .filter((line): line is string => Boolean(line))
    .join("");

  await sendTransactionalEmail({
    to: order.customerEmail,
    from: senderMailboxFromValue(input.sender),
    replyTo: replyAddress,
    subject,
    html: buildCustomerEmailHtmlShell({
      title: subject,
      intro: `Hi ${order.customerName}, here is a message about your order ${order.orderNumber}.`,
      orderNumber: order.orderNumber,
      bodyHtml: `
        <div class="section">
          <h2>Message</h2>
          <p class="body-copy">${formatHtmlBlock(messageText)}</p>
        </div>
      `,
      footerHtml: manualFooterHtml,
    }),
    text: buildCustomerEmailTextShell({
      title: subject,
      intro: `Hi ${order.customerName}, here is a message about your order ${order.orderNumber}.`,
      orderNumber: order.orderNumber,
      bodyLines: ["Message:", messageText],
      footerLines: manualFooterLines,
    }),
  });
}

function buildCustomerEmailSubject(orderNumber: string, label: string): string {
  return `${siteConfig.name} - ${orderNumber} - ${label}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPlainTextBlock(value: string): string {
  return value.trim().replace(/\r\n/g, "\n");
}

function formatHtmlBlock(value: string): string {
  return escapeHtml(formatPlainTextBlock(value)).replace(/\n/g, "<br>");
}

function buildOrderItemsHtml(items: OrderWithItems["items"]): string {
  return items
    .map((item) => {
      const productUrl = siteUrl(`/products/${item.productId}`);
      const imageAlt = escapeHtml(`${item.product.artist} - ${item.product.title}`);
      const imageHtml = item.product.imageUrl
        ? `
          <a href="${productUrl}" style="display:block;text-decoration:none">
            <img
              src="${escapeHtml(item.product.imageUrl)}"
              alt="${imageAlt}"
              width="72"
              height="72"
              style="display:block;width:72px;height:72px;border-radius:16px;border:1px solid #dbd8d0;background:#f4f3ef;object-fit:cover"
            />
          </a>
        `
        : `
          <div
            style="width:72px;height:72px;border-radius:16px;border:1px solid #dbd8d0;background:#f4f3ef;color:#6f6c66;font-size:11px;line-height:72px;text-align:center;text-transform:uppercase;letter-spacing:.14em"
          >
            No image
          </div>
        `;

      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 14px;border:1px solid #ece8e0;border-radius:18px;background:#faf8f2">
          <tr>
            <td style="padding:14px;vertical-align:top;width:88px">
              ${imageHtml}
            </td>
            <td style="padding:14px 14px 14px 0;vertical-align:top">
              <div style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#6f6c66;font-family:Manrope,'Helvetica Neue',Arial,sans-serif">
                ${escapeHtml(item.product.artist)}
              </div>
              <div style="margin:0 0 6px;font-size:17px;line-height:1.3;font-weight:700;color:#171717;font-family:Manrope,'Helvetica Neue',Arial,sans-serif">
                <a href="${productUrl}" style="color:#171717;text-decoration:none">${escapeHtml(item.product.title)}</a>
              </div>
              <div style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#3d3a35;font-family:Manrope,'Helvetica Neue',Arial,sans-serif">
                ${escapeHtml(item.product.format)} x ${item.quantity}
              </div>
              <div style="margin:0;font-size:14px;line-height:1.6;font-weight:700;color:#171717;font-family:Manrope,'Helvetica Neue',Arial,sans-serif">
                ${formatEuroFromCents(item.priceAtPurchaseCents * item.quantity)}
              </div>
            </td>
          </tr>
        </table>
      `;
    })
    .join("");
}

function senderEmailAddress(sender: CustomerEmailSender): string {
  return sender === "support" ? siteConfig.supportEmail : siteConfig.orderEmail;
}

function senderMailboxFromValue(sender: CustomerEmailSender): string {
  return `${siteConfig.name} <${senderEmailAddress(sender)}>`;
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
    body{font-family:Manrope,'Helvetica Neue',Arial,sans-serif;background:#f4f3ef;color:#171717;margin:0;padding:24px}
    .container{max-width:620px;margin:0 auto;padding:28px;background:#ffffff;border-radius:24px;border:1px solid #dbd8d0}
    .brand{margin:0 0 8px;color:#6f6c66;font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;font-family:Manrope,'Helvetica Neue',Arial,sans-serif}
    h1{margin:0 0 10px;font-size:28px;line-height:1.05;font-weight:700;color:#171717;font-family:Manrope,'Helvetica Neue',Arial,sans-serif;letter-spacing:-0.04em}
    .intro{margin:0 0 18px;font-size:15px;line-height:1.7;color:#3d3a35}
    .order-chip{display:inline-block;margin:0 0 18px;padding:8px 14px;border:1px solid #dbd8d0;border-radius:999px;background:#faf8f2;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#6f6c66;font-family:Manrope,'Helvetica Neue',Arial,sans-serif}
    .section{padding:16px 0;border-top:1px solid #ece8e0}
    .section:first-of-type{border-top:0;padding-top:0}
    .section h2{margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#6f6c66;font-family:Manrope,'Helvetica Neue',Arial,sans-serif}
    .body-copy{margin:0;font-size:14px;line-height:1.7;color:#3d3a35;font-family:Manrope,'Helvetica Neue',Arial,sans-serif}
    .body-pre{margin:0;white-space:pre-wrap;font-size:14px;line-height:1.7;color:#3d3a35;font-family:Manrope,'Helvetica Neue',Arial,sans-serif}
    .totals{font-size:15px;line-height:1.8;color:#171717}
    .totals strong{font-weight:700}
    .order-chip-label{margin-right:6px;opacity:.72}
    .footer{margin-top:24px;padding-top:16px;border-top:1px solid #ece8e0;font-size:12px;line-height:1.8;color:#6f6c66;font-family:Manrope,'Helvetica Neue',Arial,sans-serif}
    a{color:#171717}
  </style>
</head>
<body>
  <div class="container">
    <p class="brand">${siteConfig.name}</p>
    <h1>${title}</h1>
    <p class="intro">${intro}</p>
    ${orderNumber ? `<div class="order-chip"><span class="order-chip-label">Order Number:</span>${orderNumber}</div>` : ""}
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
    orderNumber ? `Order Number: ${orderNumber}` : null,
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
  itemsHtml,
  subtotal,
  shipping,
  total,
  address,
  deliveryMethod,
  invoiceUrl,
}: {
  orderNumber: string;
  customerName: string;
  itemsHtml: string;
  subtotal: string;
  shipping: string;
  total: string;
  address: string;
  deliveryMethod: string;
  invoiceUrl: string;
}): string {
  const deliveryLabel =
    deliveryMethod === "pickup" ? "Pickup details" : "Shipping address";
  const isPickup = deliveryMethod === "pickup";
  const pickupNext = "You will receive a follow-up email with local pickup details.";

  return buildCustomerEmailHtmlShell({
    title: "Order confirmed",
    intro: isPickup
      ? `Thanks, ${customerName}. Your pickup reservation is confirmed.`
      : `Thanks, ${customerName}. Your order is confirmed.`,
    orderNumber,
    bodyHtml: `
      <div class="section">
        <h2>Items</h2>
        ${itemsHtml}
      </div>
      <div class="section">
        <h2>Totals</h2>
        <div class="totals">Subtotal: ${subtotal}<br>Shipping: ${shipping}<br><strong>Total: ${total}</strong></div>
      </div>
      <div class="section">
        <h2>${deliveryLabel}</h2>
        <pre class="body-pre">${address}</pre>
      </div>
      ${
        isPickup
          ? `<div class="section">
              <h2>Next</h2>
              <p class="body-copy">${escapeHtml(pickupNext)}</p>
            </div>`
          : ""
      }
    `,
    footerHtml: `
      <p>Download invoice: <a href="${invoiceUrl}">${invoiceUrl}</a></p>
      ${
        isPickup
          ? `<p>Questions about pickup: <a href="mailto:${siteConfig.supportEmail}">${siteConfig.supportEmail}</a></p>`
          : `<p>Track your order: <a href="${siteUrl("/track-order")}">${siteUrl("/track-order")}</a></p><p>Tracking is added as soon as your parcel ships.</p>`
      }
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
  const isPickup = deliveryMethod === "pickup";
  const pickupNext = "You will receive a follow-up email with local pickup details.";

  return buildCustomerEmailTextShell({
    title: "Order confirmed",
    intro: isPickup
      ? `Thanks, ${customerName}. Your pickup reservation is confirmed.`
      : `Thanks, ${customerName}. Your order is confirmed.`,
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
      ...(isPickup ? ["", pickupNext] : []),
    ],
    footerLines: [
      `Download invoice: ${invoiceUrl}`,
      ...(isPickup
        ? [`Questions about pickup: ${siteConfig.supportEmail}`]
        : [
            `Track your order: ${siteUrl("/track-order")}`,
            "Tracking is added as soon as your parcel ships.",
          ]),
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
      trackingNumber ? `${trackingCarrier || "Tracking"}: ${trackingNumber}` : null,
      trackingUrl ? `Tracking page: ${trackingUrl}` : null,
    ].filter((line): line is string => Boolean(line)),
    footerLines: [`Track your order: ${siteUrl("/track-order")}`],
  });
}

function formatAddress(addr: ShippingAddress): string {
  if (addr.country === "PICKUP") {
    return pickupAddressCoreLines().join("\n");
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
