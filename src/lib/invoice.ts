import { createHmac, timingSafeEqual } from "crypto";
import { eq, and } from "drizzle-orm";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { db, schema } from "@/db";
import { formatEuroFromCents } from "@/lib/money";
import { legalAddressLines, pickupAddressLines, siteConfig } from "@/lib/site";
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

function sanitizePdfText(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u2012-\u2015]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, " ");

  return Array.from(normalized)
    .filter((character) => {
      if (character === "\t" || character === "\n" || character === "\r") {
        return true;
      }

      const code = character.charCodeAt(0);
      return code >= 32 && code <= 255;
    })
    .join("");
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
    return pickupAddressLines();
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

function formatInvoiceMoney(cents: number): string {
  return sanitizePdfText(formatEuroFromCents(cents).replace(/\s?€/u, " EUR"));
}

function wrapPdfText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const normalized = sanitizePdfText(text).trim();
  if (!normalized) {
    return [""];
  }

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  const commitLine = (line: string) => {
    if (line.trim()) {
      lines.push(line.trim());
    }
  };

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
      currentLine = testLine;
      continue;
    }

    if (currentLine) {
      commitLine(currentLine);
      currentLine = "";
    }

    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      currentLine = word;
      continue;
    }

    let partial = "";
    for (const character of Array.from(word)) {
      const nextPartial = `${partial}${character}`;
      if (font.widthOfTextAtSize(nextPartial, size) <= maxWidth) {
        partial = nextPartial;
      } else {
        commitLine(partial);
        partial = character;
      }
    }

    currentLine = partial;
  }

  if (currentLine) {
    commitLine(currentLine);
  }

  return lines.length > 0 ? lines : [normalized];
}

function drawPdfTextLines(
  page: PDFPage,
  lines: string[],
  options: {
    x: number;
    y: number;
    lineHeight: number;
    size: number;
    font: PDFFont;
    color?: ReturnType<typeof rgb>;
  }
): number {
  let currentY = options.y;
  for (const line of lines) {
    page.drawText(sanitizePdfText(line), {
      x: options.x,
      y: currentY,
      size: options.size,
      font: options.font,
      color: options.color,
    });
    currentY -= options.lineHeight;
  }
  return currentY;
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
  return `invoice-${orderNumber.toLowerCase()}.pdf`;
}

export async function buildInvoicePdf(order: OrderWithItems): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const muted = rgb(0.44, 0.42, 0.4);
  const foreground = rgb(0.09, 0.09, 0.09);
  const border = rgb(0.88, 0.86, 0.82);
  const panel = rgb(0.984, 0.98, 0.965);
  const showTaxLine = order.taxCents > 0;
  const storeLines = legalAddressLines();
  const customerLines = formatAddressLines(order.shippingAddress);
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const createPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < margin) {
      createPage();
      return true;
    }
    return false;
  };

  const drawPanel = (
    x: number,
    topY: number,
    width: number,
    heading: string,
    lines: string[]
  ) => {
    const contentLines = lines.map((line) => sanitizePdfText(line));
    const panelHeight = 26 + contentLines.length * 13 + 18;
    page.drawRectangle({
      x,
      y: topY - panelHeight,
      width,
      height: panelHeight,
      color: panel,
      borderColor: border,
      borderWidth: 1,
    });
    page.drawText(sanitizePdfText(heading.toUpperCase()), {
      x: x + 14,
      y: topY - 18,
      size: 9,
      font: boldFont,
      color: muted,
    });
    drawPdfTextLines(page, contentLines, {
      x: x + 14,
      y: topY - 36,
      lineHeight: 13,
      size: 10.5,
      font: regularFont,
      color: foreground,
    });
    return panelHeight;
  };

  const drawTableHeader = () => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: border,
    });
    y -= 18;

    const headers = [
      { text: "ITEM", x: margin, width: 220 },
      { text: "FORMAT", x: margin + 230, width: 70 },
      { text: "QTY", x: margin + 308, width: 30 },
      { text: "UNIT", x: margin + 352, width: 70 },
      { text: "LINE TOTAL", x: margin + 432, width: 90 },
    ];

    for (const header of headers) {
      page.drawText(header.text, {
        x: header.x,
        y,
        size: 8.5,
        font: boldFont,
        color: muted,
      });
    }

    y -= 12;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: border,
    });
    y -= 16;
  };

  page.drawText("FEDERICO SHOP", {
    x: margin,
    y,
    size: 9,
    font: boldFont,
    color: muted,
  });
  page.drawText("Invoice", {
    x: margin,
    y: y - 26,
    size: 28,
    font: boldFont,
    color: foreground,
  });

  const metadataX = pageWidth - margin - 180;
  const metadataLines = [
    sanitizePdfText(order.orderNumber),
    `Date: ${formatInvoiceDate(order.createdAt)}`,
    `Payment: ${paymentMethodLabel(order.paymentMethod)}`,
    `Delivery: ${deliveryMethodLabel(order.deliveryMethod)}`,
  ];
  drawPdfTextLines(page, metadataLines, {
    x: metadataX,
    y: y - 2,
    lineHeight: 15,
    size: 10.5,
    font: regularFont,
    color: foreground,
  });

  y -= 92;

  const fromLines = [...storeLines];
  if (siteConfig.legal.vatId) {
    fromLines.push(`VAT ID: ${siteConfig.legal.vatId}`);
  }
  fromLines.push(siteConfig.supportEmail);

  const panelTop = y;
  const leftHeight = drawPanel(margin, panelTop, 238, "From", fromLines);
  const rightHeight = drawPanel(pageWidth - margin - 238, panelTop, 238, "Bill to", customerLines);
  y -= Math.max(leftHeight, rightHeight) + 28;

  drawTableHeader();

  for (const item of order.items) {
    const titleLines = wrapPdfText(
      `${item.product.artist} - ${item.product.title}`,
      regularFont,
      10.5,
      220
    );
    const rowHeight = Math.max(24, titleLines.length * 13 + 8);

    if (y - rowHeight < 150) {
      createPage();
      drawTableHeader();
    }

    drawPdfTextLines(page, titleLines, {
      x: margin,
      y,
      lineHeight: 13,
      size: 10.5,
      font: regularFont,
      color: foreground,
    });
    page.drawText(sanitizePdfText(item.product.format.toUpperCase()), {
      x: margin + 230,
      y,
      size: 10,
      font: regularFont,
      color: foreground,
    });
    page.drawText(String(item.quantity), {
      x: margin + 308,
      y,
      size: 10,
      font: regularFont,
      color: foreground,
    });
    page.drawText(formatInvoiceMoney(item.priceAtPurchaseCents), {
      x: margin + 352,
      y,
      size: 10,
      font: regularFont,
      color: foreground,
    });
    page.drawText(formatInvoiceMoney(item.priceAtPurchaseCents * item.quantity), {
      x: margin + 432,
      y,
      size: 10,
      font: regularFont,
      color: foreground,
    });

    y -= rowHeight;
    page.drawLine({
      start: { x: margin, y: y + 2 },
      end: { x: pageWidth - margin, y: y + 2 },
      thickness: 1,
      color: border,
    });
    y -= 12;
  }

  ensureSpace(120);

  const totalsBoxWidth = 220;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  const totalsBoxTop = y;
  const totals = [
    ["Subtotal", formatInvoiceMoney(order.subtotalCents)],
    ["Shipping", formatInvoiceMoney(order.shippingCents)],
    ...(showTaxLine ? ([["VAT", formatInvoiceMoney(order.taxCents)] ] as const) : []),
  ] as const;
  const totalsBoxHeight = 56 + totals.length * 18;
  page.drawRectangle({
    x: totalsBoxX,
    y: totalsBoxTop - totalsBoxHeight,
    width: totalsBoxWidth,
    height: totalsBoxHeight,
    color: panel,
    borderColor: border,
    borderWidth: 1,
  });

  let totalsY = totalsBoxTop - 18;
  for (const [label, value] of totals) {
    page.drawText(label, {
      x: totalsBoxX + 14,
      y: totalsY,
      size: 10.5,
      font: regularFont,
      color: foreground,
    });
    page.drawText(value, {
      x: totalsBoxX + 112,
      y: totalsY,
      size: 10.5,
      font: boldFont,
      color: foreground,
    });
    totalsY -= 18;
  }

  page.drawLine({
    start: { x: totalsBoxX + 14, y: totalsY + 4 },
    end: { x: totalsBoxX + totalsBoxWidth - 14, y: totalsY + 4 },
    thickness: 1,
    color: border,
  });
  totalsY -= 12;
  page.drawText("Total", {
    x: totalsBoxX + 14,
    y: totalsY,
    size: 13,
    font: boldFont,
    color: foreground,
  });
  page.drawText(formatInvoiceMoney(order.totalCents), {
    x: totalsBoxX + 112,
    y: totalsY,
    size: 13,
    font: boldFont,
    color: foreground,
  });

  y = totalsBoxTop - totalsBoxHeight - 26;

  ensureSpace(36);
  drawPdfTextLines(
    page,
    wrapPdfText(
      `Thank you for your order. If you need help with this invoice, contact ${siteConfig.supportEmail}.`,
      regularFont,
      9.5,
      pageWidth - margin * 2
    ),
    {
      x: margin,
      y,
      lineHeight: 13,
      size: 9.5,
      font: regularFont,
      color: muted,
    }
  );

  return pdf.save();
}
