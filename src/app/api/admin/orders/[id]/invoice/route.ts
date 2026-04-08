import { NextResponse } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import {
  buildInvoiceFilename,
  buildInvoicePdf,
  getOrderWithItemsById,
} from "@/lib/invoice";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await requireAuthenticatedAdmin();

  const { id } = await context.params;
  const order = await getOrderWithItemsById(id);

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
