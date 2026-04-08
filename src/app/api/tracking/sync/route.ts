import { NextRequest, NextResponse } from "next/server";
import { isTrackingSyncConfigured, syncShippedOrders } from "@/lib/order-tracking";

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

    return NextResponse.json({
      synced: results.length,
      updated: results.filter((result) => result.updated).length,
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
