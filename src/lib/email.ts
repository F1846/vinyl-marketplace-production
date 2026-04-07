import { Resend } from "resend";
import { OrderWithItems } from "@/types/order";

let _resend: Resend | null = null;

function resend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not configured");
    _resend = new Resend(key);
  }
  return _resend;
}

// ─── Order Confirmation Email ──────────────────────

export async function sendOrderConfirmation(order: OrderWithItems) {
  const from = process.env.EMAIL_FROM ?? "orders@yourdomain.com";

  const lineItems = order.items
    .map(
      (item) =>
        `${item.product.artist} - ${item.product.title} (${item.product.format}) x ${item.quantity} = $${(item.priceAtPurchaseCents / 100).toFixed(2)}`
    )
    .join("\n");

  const total = (order.totalCents / 100).toFixed(2);
  const shipping = (order.shippingCents / 100).toFixed(2);
  const subtotal = (order.subtotalCents / 100).toFixed(2);

  const html = buildEmailHtml({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    lineItems,
    subtotal,
    shipping,
    total,
    address: formatAddress(order.shippingAddress),
  });

  await resend().emails.send({
    from,
    to: order.customerEmail,
    subject: `Order ${order.orderNumber} Confirmed - F1846 Vinyl`,
    html,
  });
}

// ─── Shipping Notification (post-MVP) ──────────────

export async function sendShippingNotification(order: OrderWithItems) {
  const from = process.env.EMAIL_FROM ?? "orders@yourdomain.com";

  const html = buildShippingEmail({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    trackingNumber: order.trackingNumber,
    trackingCarrier: order.trackingCarrier,
  });

  await resend().emails.send({
    from,
    to: order.customerEmail,
    subject: `Order ${order.orderNumber} Shipped - F1846 Vinyl`,
    html,
  });
}

// ─── Email Templates (React -> HTML) ───────────────

function buildEmailHtml({
  orderNumber,
  customerName,
  lineItems,
  subtotal,
  shipping,
  total,
  address,
}: Record<string, string>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:Inter,system-ui,-apple-system,sans-serif;background:#1a1a1a;color:#e0e0e0;margin:0;padding:0}
.container{max-width:600px;margin:24px auto;padding:24px;background:#2d2d2d;border-radius:8px}
h1{color:#d4a843;font-size:20px;margin:0 0 8px}h2{font-size:16px;color:#e0e0e0;margin:16px 0 8px}
.line-item{padding:8px 0;border-bottom:1px solid #404040}
.totals{padding:8px 0;text-align:right;font-size:18px;font-weight:bold}
.footer{margin-top:24px;font-size:12px;color:#999;text-align:center;border-top:1px solid #404040;padding-top:16px}
a{color:#d4a843}</style>
</head><body><div class="container">
  <h1>F1846 Vinyl</h1>
  <p>Thanks, ${customerName}!</p>
  <h2>Order ${orderNumber}</h2>
  <div class="line-item"><pre style="white-space:pre-wrap;font-size:14px">${lineItems}</pre></div>
  <div class="totals">Subtotal: $${subtotal}<br>Shipping: $${shipping}<br><strong>Total: $${total}</strong></div>
  <h2>Shipping To</h2>
  <pre style="white-space:pre-wrap;font-size:14px">${address}</pre>
  <div class="footer">Expected delivery: 5-7 business days. Track your order: <a href="<NEXT_PUBLIC_SITE_URL>/track-order"><NEXT_PUBLIC_SITE_URL>/track-order</a></div>
</div></body></html>`
    .replace(/<NEXT_PUBLIC_SITE_URL>/g, process.env.NEXT_PUBLIC_SITE_URL ?? "https://f1846vinyl.com");
}

function buildShippingEmail({
  orderNumber,
  customerName,
  trackingNumber,
  trackingCarrier,
}: Record<string, string | null>): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<div style="max-width:600px;margin:24px auto;padding:24px;background:#2d2d2d;border-radius:8px;font-family:Inter,system-ui,sans-serif;color:#e0e0e0">
<h1 style="color:#d4a843">F1846 Vinyl</h1>
<p>Thanks, ${customerName}!</p>
<h2>Order ${orderNumber} has shipped!</h2>
<p><strong>${trackingCarrier}</strong>: <code>${trackingNumber}</code></p>
<div class="footer"><p>Questions? Just reply to this email.</div>
</div></body></html>`;
}

function formatAddress(addr: Record<string, string | null>): string {
  return [
    addr.name,
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postalCode].filter(Boolean).join(" "),
    addr.country,
  ]
    .filter(Boolean)
    .join("\n");
}
