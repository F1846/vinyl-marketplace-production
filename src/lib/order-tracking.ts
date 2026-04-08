import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getOrderStatusRank,
  type OrderStatus,
  type TrackingCheckpoint,
  type TrackingSummary,
} from "@/types/order";

const AFTERSHIP_BASE_URL = "https://api.aftership.com/tracking/2025-07";

const CARRIER_TRACKING_URLS: Record<string, string> = {
  dhl: "https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id={trackingNumber}",
  "deutsche-post": "https://www.deutschepost.de/sendung/simpleQuery.html?locale=en_GB&shipmentId={trackingNumber}",
  dpd: "https://tracking.dpd.de/status/en_US/parcel/{trackingNumber}",
  gls: "https://gls-group.com/DE/en/parcel-tracking?match={trackingNumber}",
  ups: "https://www.ups.com/track?tracknum={trackingNumber}",
  fedex: "https://www.fedex.com/fedextrack/?trknbr={trackingNumber}",
  usps: "https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}",
  hermes: "https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/?trackingnumber={trackingNumber}",
  "royal-mail": "https://www.royalmail.com/track-your-item#/tracking-results/{trackingNumber}",
  posteitaliane:
    "https://www.poste.it/cerca/index.html#/risultati-spedizioni/{trackingNumber}",
  colissimo: "https://www.laposte.fr/outils/suivre-vos-envois?code={trackingNumber}",
  bpost: "https://track.bpost.cloud/track/items?itemIdentifier={trackingNumber}",
};

type OrderRecord = typeof schema.orders.$inferSelect;

type AfterShipTracking = {
  tracking_number?: string;
  slug?: string;
  courier_name?: string;
  tag?: string;
  subtag_message?: string;
  title?: string;
  expected_delivery?: string;
  latest_checkpoint?: {
    checkpoint_time?: string;
    checkpoint_location?: string;
    city?: string;
    country_name?: string;
    message?: string;
    tag?: string;
  };
  checkpoints?: Array<{
    checkpoint_time?: string;
    checkpoint_location?: string;
    city?: string;
    country_name?: string;
    message?: string;
    tag?: string;
  }>;
  shipment_delivery_url?: string;
};

function getAfterShipApiKey(): string | null {
  const key = process.env.AFTERSHIP_API_KEY?.trim();
  return key || null;
}

function normalizeCarrierSlug(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//.test(normalized)) {
    return normalized;
  }

  return normalized
    .replace(/\s+/g, "-")
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function humanizeCarrier(value: string | null | undefined): string | null {
  const normalized = normalizeCarrierSlug(value);
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//.test(normalized)) {
    return "Carrier tracking";
  }

  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildTrackingUrl(
  carrierInput: string | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  const normalizedTrackingNumber = trackingNumber?.trim();
  if (!normalizedTrackingNumber) {
    return null;
  }

  const normalizedCarrier = normalizeCarrierSlug(carrierInput);
  if (normalizedCarrier && /^https?:\/\//.test(normalizedCarrier)) {
    if (normalizedCarrier.includes("{trackingNumber}")) {
      return normalizedCarrier.replaceAll(
        "{trackingNumber}",
        encodeURIComponent(normalizedTrackingNumber)
      );
    }

    return normalizedCarrier;
  }

  if (normalizedCarrier && CARRIER_TRACKING_URLS[normalizedCarrier]) {
    return CARRIER_TRACKING_URLS[normalizedCarrier].replace(
      "{trackingNumber}",
      encodeURIComponent(normalizedTrackingNumber)
    );
  }

  const searchTerms = [normalizedCarrier, normalizedTrackingNumber]
    .filter(Boolean)
    .join(" tracking ");

  return `https://www.google.com/search?q=${encodeURIComponent(searchTerms || normalizedTrackingNumber)}`;
}

function buildDirectTrackingSummary(order: OrderRecord): TrackingSummary | null {
  if (!order.trackingNumber) {
    return null;
  }

  const carrierSlug = normalizeCarrierSlug(order.trackingCarrier);
  const carrierName = humanizeCarrier(order.trackingCarrier);

  return {
    provider: "carrier",
    trackingNumber: order.trackingNumber,
    carrierSlug,
    carrierName,
    carrierStatus: null,
    carrierStatusLabel: "Tracking link ready",
    message: carrierSlug
      ? `Open the carrier page to check the latest shipment scan for ${order.orderNumber}.`
      : `Use the tracking number to check the latest shipment scan for ${order.orderNumber}.`,
    trackingUrl: buildTrackingUrl(order.trackingCarrier, order.trackingNumber),
    lastUpdatedAt: null,
    checkpoints: [],
  };
}

export function isTrackingSyncConfigured(): boolean {
  return Boolean(getAfterShipApiKey());
}

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

async function afterShipFetch<T>(path: string, init?: FetchInit): Promise<T> {
  const apiKey = getAfterShipApiKey();
  if (!apiKey) {
    throw new Error("Tracking sync is not configured.");
  }

  const response = await fetch(`${AFTERSHIP_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "as-api-key": apiKey,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Tracking service request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

function getTrackingFromEnvelope(payload: unknown): AfterShipTracking | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | undefined;

  if (data?.tracking && typeof data.tracking === "object") {
    return data.tracking as AfterShipTracking;
  }

  if (Array.isArray(data?.trackings) && data.trackings[0] && typeof data.trackings[0] === "object") {
    return data.trackings[0] as AfterShipTracking;
  }

  return null;
}

async function findTracking(
  trackingNumber: string,
  carrierSlug?: string | null
): Promise<AfterShipTracking | null> {
  const params = new URLSearchParams({ tracking_numbers: trackingNumber });
  if (carrierSlug?.trim()) {
    params.set("slug", carrierSlug.trim());
  }

  const payload = await afterShipFetch<unknown>(`/trackings?${params.toString()}`);
  return getTrackingFromEnvelope(payload);
}

async function createTracking(order: OrderRecord): Promise<AfterShipTracking | null> {
  if (!order.trackingNumber) {
    return null;
  }

  const payload = await afterShipFetch<unknown>("/trackings", {
    method: "POST",
    body: JSON.stringify({
      tracking: {
        tracking_number: order.trackingNumber,
        ...(order.trackingCarrier ? { slug: order.trackingCarrier } : {}),
        title: order.orderNumber,
        order_id: order.orderNumber,
      },
    }),
  });

  return getTrackingFromEnvelope(payload);
}

function mapCheckpoint(checkpoint: AfterShipTracking["latest_checkpoint"]): TrackingCheckpoint {
  return {
    message: checkpoint?.message?.trim() || "Tracking update received.",
    location:
      checkpoint?.checkpoint_location?.trim() ||
      [checkpoint?.city?.trim(), checkpoint?.country_name?.trim()].filter(Boolean).join(", ") ||
      null,
    status: checkpoint?.tag?.trim() || null,
    timestamp: checkpoint?.checkpoint_time?.trim() || null,
  };
}

function normalizeTrackingSummary(
  tracking: AfterShipTracking,
  order?: Pick<OrderRecord, "trackingCarrier" | "trackingNumber" | "orderNumber">
): TrackingSummary {
  const checkpoints = Array.isArray(tracking.checkpoints)
    ? tracking.checkpoints.map((checkpoint) => mapCheckpoint(checkpoint))
    : tracking.latest_checkpoint
      ? [mapCheckpoint(tracking.latest_checkpoint)]
      : [];

  const latestCheckpoint = checkpoints[0] ?? null;
  const carrierStatus = tracking.tag?.trim() || null;

  return {
    provider: "aftership",
    trackingNumber: tracking.tracking_number?.trim() || "",
    carrierSlug: tracking.slug?.trim() || null,
    carrierName:
      tracking.courier_name?.trim() ||
      humanizeCarrier(tracking.slug?.trim() || order?.trackingCarrier) ||
      null,
    carrierStatus,
    carrierStatusLabel: getTrackingStatusLabel(carrierStatus),
    message:
      tracking.subtag_message?.trim() ||
      latestCheckpoint?.message ||
      tracking.expected_delivery?.trim() ||
      null,
    trackingUrl:
      tracking.shipment_delivery_url?.trim() ||
      buildTrackingUrl(
        tracking.slug?.trim() || order?.trackingCarrier,
        tracking.tracking_number?.trim() || order?.trackingNumber
      ),
    lastUpdatedAt: latestCheckpoint?.timestamp || null,
    checkpoints,
  };
}

export function getTrackingStatusLabel(tag: string | null): string {
  switch ((tag || "").toLowerCase().replace(/[\s_]/g, "")) {
    case "pending":
      return "Label created";
    case "inforeceived":
      return "Info received";
    case "intransit":
      return "In transit";
    case "outfordelivery":
      return "Out for delivery";
    case "availableforpickup":
      return "Available for pickup";
    case "delivered":
      return "Delivered";
    case "exception":
      return "Delivery exception";
    case "attemptfail":
      return "Delivery attempt failed";
    case "expired":
      return "Shipment expired";
    default:
      return tag ? tag.replace(/_/g, " ") : "Tracking active";
  }
}

function mapTrackingTagToOrderStatus(tag: string | null): OrderStatus | null {
  switch ((tag || "").toLowerCase().replace(/[\s_]/g, "")) {
    case "delivered":
      return "delivered";
    case "intransit":
    case "outfordelivery":
    case "availableforpickup":
    case "attemptfail":
    case "exception":
    case "expired":
      return "shipped";
    case "pending":
    case "inforeceived":
      return "processing";
    default:
      return null;
  }
}

export async function fetchTrackingSummary(order: OrderRecord): Promise<TrackingSummary | null> {
  if (!order.trackingNumber) {
    return null;
  }

  const directSummary = buildDirectTrackingSummary(order);

  if (!isTrackingSyncConfigured()) {
    return directSummary;
  }

  try {
    let tracking = await findTracking(order.trackingNumber, order.trackingCarrier);
    if (!tracking) {
      tracking = await createTracking(order);
    }

    if (!tracking) {
      return directSummary;
    }

    return normalizeTrackingSummary(tracking, order);
  } catch {
    return directSummary;
  }
}

export async function syncOrderTracking(order: OrderRecord): Promise<{
  order: OrderRecord;
  trackingSummary: TrackingSummary | null;
  updated: boolean;
  previousStatus: OrderStatus;
  statusChanged: boolean;
}> {
  const trackingSummary = await fetchTrackingSummary(order);
  if (!trackingSummary) {
    return {
      order,
      trackingSummary: null,
      updated: false,
      previousStatus: order.status as OrderStatus,
      statusChanged: false,
    };
  }

  const updates: Partial<OrderRecord> = {};
  const suggestedStatus = mapTrackingTagToOrderStatus(trackingSummary.carrierStatus);

  if (
    trackingSummary.carrierSlug &&
    trackingSummary.carrierSlug !== order.trackingCarrier
  ) {
    updates.trackingCarrier = trackingSummary.carrierSlug;
  }

  if (
    suggestedStatus &&
    order.status !== "cancelled" &&
    getOrderStatusRank(suggestedStatus) > getOrderStatusRank(order.status as OrderStatus)
  ) {
    updates.status = suggestedStatus;
  }

  if (Object.keys(updates).length === 0) {
    return {
      order,
      trackingSummary,
      updated: false,
      previousStatus: order.status as OrderStatus,
      statusChanged: false,
    };
  }

  const [updatedOrder] = await db()
    .update(schema.orders)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(schema.orders.id, order.id))
    .returning();

  return {
    order: updatedOrder ?? order,
    trackingSummary,
    updated: Boolean(updatedOrder),
    previousStatus: order.status as OrderStatus,
    statusChanged: Boolean(updatedOrder) && updatedOrder.status !== order.status,
  };
}

export async function syncOrderTrackingById(orderId: string) {
  const order = await db().query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
  });

  if (!order) {
    return null;
  }

  return syncOrderTracking(order);
}

export async function syncShippedOrders(limit = 25) {
  const openOrders = await db().query.orders.findMany({
    where: eq(schema.orders.deliveryMethod, "shipping"),
    limit,
  });

  const syncable = openOrders.filter(
    (order) =>
      Boolean(order.trackingNumber) &&
      order.status !== "cancelled" &&
      order.status !== "delivered"
  );

  const results = [];
  for (const order of syncable) {
    results.push(await syncOrderTracking(order));
  }

  return results;
}
