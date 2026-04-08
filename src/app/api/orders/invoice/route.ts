import { NextRequest, NextResponse } from "next/server";
import {
  buildInvoiceFilename,
  buildInvoicePdf,
  getOrderWithItemsById,
  verifyInvoiceToken,
} from "@/lib/invoice";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ error: "Missing invoice token" }, { status: 400 });
  }

  const verified = verifyInvoiceToken(token);

  if (!verified) {
    return NextResponse.json({ error: "Invalid invoice token" }, { status: 403 });
  }

  const order = await getOrderWithItemsById(verified.orderId);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(await buildInvoicePdf(order)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${buildInvoiceFilename(order.orderNumber)}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
