import { NextRequest, NextResponse } from "next/server";
import { isTrackingSyncConfigured, syncShippedOrders } from "@/lib/order-tracking";
import { sendOrderUpdateEmailById } from "@/lib/order-notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  if (!isTrackingSyncConfigured()) {
    return NextResponse.json(
      { error: { code: "TRACKING_NOT_CONFIGURED" } },
      { status: 503 }
    );
  }

  try {
    const results = await syncShippedOrders(50);
    let emailed = 0;

    for (const result of results) {
      if (!result.statusChanged) {
        continue;
      }

      try {
        await sendOrderUpdateEmailById({
          orderId: result.order.id,
          previousStatus: result.previousStatus,
          trackingSummary: result.trackingSummary,
          kind: result.order.status === "shipped" ? "shipping" : "status",
        });
        emailed += 1;
      } catch (error) {
        console.error("Failed to send tracking sync email:", error);
      }
    }

    return NextResponse.json({
      synced: results.length,
      updated: results.filter((result) => result.updated).length,
      emailed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "TRACKING_SYNC_FAILED",
          message:
            error instanceof Error ? error.message : "Tracking sync failed.",
        },
      },
      { status: 500 }
    );
  }
}
