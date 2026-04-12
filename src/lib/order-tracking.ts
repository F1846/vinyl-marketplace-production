import "server-only";

import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getOrderStatusRank,
  type OrderStatus,
  type TrackingCheckpoint,
  type TrackingSummary,
} from "@/types/order";
import { normalizeCarrierSlug, buildTrackingUrl } from "./carrier-tracking";

export { buildTrackingUrl };

const AFTERSHIP_BASE_URL = "https://api.aftership.com/tracking/2025-07";
const SEVENTEENTRACK_BASE_URL = "https://api.17track.net/track/v2";
const SHIP24_BASE_URL = "https://api.ship24.com/public/v1";

const TRACKING_STATUS_LABELS: Record<string, string> = {
  pending: "Label created",
  inforeceived: "Info received",
  notfound: "Not found",
  intransit: "In transit",
  outfordelivery: "Out for delivery",
  availableforpickup: "Available for pickup",
  delivered: "Delivered",
  exception: "Delivery exception",
  deliveryfailure: "Delivery failure",
  failedattempt: "Delivery attempt failed",
  attemptfail: "Delivery attempt failed",
  expired: "Shipment expired",
};

type TrackingProviderId = "ship24" | "17track" | "aftership";
type OrderRecord = typeof schema.orders.$inferSelect;
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

type Ship24Tracking = {
  tracker?: {
    trackingNumber?: string;
    courierCode?: string | string[];
  };
  shipment?: {
    statusCode?: string | null;
    statusCategory?: string | null;
    statusMilestone?: string | null;
    delivery?: {
      estimatedDeliveryDate?: string | null;
    };
    trackingNumbers?: Array<{ tn?: string }>;
  };
  events?: Array<{
    status?: string;
    occurrenceDatetime?: string;
    location?: string | null;
    courierCode?: string | null;
    statusCode?: string | null;
    statusCategory?: string | null;
    statusMilestone?: string | null;
  }>;
  statistics?: {
    timestamps?: {
      infoReceivedDatetime?: string | null;
      inTransitDatetime?: string | null;
      outForDeliveryDatetime?: string | null;
      failedAttemptDatetime?: string | null;
      availableForPickupDatetime?: string | null;
      exceptionDatetime?: string | null;
      deliveredDatetime?: string | null;
    };
  };
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPath(value: unknown, path: Array<string | number>): unknown {
  let current: unknown = value;

  for (const key of path) {
    if (typeof key === "number") {
      if (!Array.isArray(current) || key >= current.length) {
        return undefined;
      }
      current = current[key];
      continue;
    }

    if (!isRecord(current) || !(key in current)) {
      return undefined;
    }

    current = current[key];
  }

  return current;
}

function firstString(
  value: unknown,
  paths: Array<Array<string | number>>
): string | null {
  for (const path of paths) {
    const candidate = getPath(value, path);
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function firstObjectArray(
  value: unknown,
  paths: Array<Array<string | number>>
): Array<Record<string, unknown>> | null {
  for (const path of paths) {
    const candidate = getPath(value, path);
    if (Array.isArray(candidate)) {
      const objects = candidate.filter(isRecord);
      if (objects.length > 0) {
        return objects;
      }
    }
  }

  return null;
}

function findFirstMatchingString(
  value: unknown,
  // eslint-disable-next-line no-unused-vars
  predicate: (candidate: string) => boolean
): string | null {
  if (typeof value === "string" && predicate(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstMatchingString(item, predicate);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (isRecord(value)) {
    for (const nested of Object.values(value)) {
      const found = findFirstMatchingString(nested, predicate);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function normalizeStatusKey(value: string | null | undefined): string {
  return (value || "").toLowerCase().replace(/[\s_-]/g, "");
}

function getAfterShipApiKey(): string | null {
  const key = process.env.AFTERSHIP_API_KEY?.trim();
  return key || null;
}

function getShip24ApiKey(): string | null {
  const key = process.env.SHIP24_API_KEY?.trim();
  return key || null;
}

function get17TrackApiKey(): string | null {
  const key = process.env.SEVENTEENTRACK_API_KEY?.trim();
  return key || null;
}

function getTrackingProvider(): TrackingProviderId | null {
  const preferred = process.env.TRACKING_PROVIDER?.trim().toLowerCase();

  if (preferred === "ship24" && getShip24ApiKey()) {
    return "ship24";
  }

  if (preferred === "17track" && get17TrackApiKey()) {
    return "17track";
  }

  if (preferred === "aftership" && getAfterShipApiKey()) {
    return "aftership";
  }

  if (getShip24ApiKey()) {
    return "ship24";
  }

  if (get17TrackApiKey()) {
    return "17track";
  }

  if (getAfterShipApiKey()) {
    return "aftership";
  }

  return null;
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

function get17TrackCarrierCode(value: string | null | undefined): number | null {
  const normalized = value?.trim();
  if (!normalized || !/^\d+$/.test(normalized)) {
    return null;
  }

  return Number(normalized);
}

function buildDirectTrackingSummary(order: OrderRecord): TrackingSummary | null {
  if (!order.trackingNumber) {
    return null;
  }

  const carrierSlug = normalizeCarrierSlug(order.trackingCarrier);
  const carrierName = humanizeCarrier(order.trackingCarrier);
  const trackingUrl = buildTrackingUrl(order.trackingCarrier, order.trackingNumber);

  return {
    provider: "carrier",
    trackingNumber: order.trackingNumber,
    carrierSlug,
    carrierName,
    carrierStatus: null,
    carrierStatusLabel: "Tracking link ready",
    message: trackingUrl
      ? `Open the carrier page to check the latest shipment scan for ${order.orderNumber}.`
      : `Use the tracking number to check the latest shipment scan for ${order.orderNumber}.`,
    trackingUrl,
    lastUpdatedAt: null,
    checkpoints: [],
  };
}

export function isTrackingSyncConfigured(): boolean {
  return Boolean(getTrackingProvider());
}

async function ship24Fetch<T>(path: string, init?: FetchInit): Promise<T> {
  const apiKey = getShip24ApiKey();
  if (!apiKey) {
    throw new Error("Ship24 tracking sync is not configured.");
  }

  const response = await fetch(`${SHIP24_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Ship24 request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

function getShip24TrackingFromEnvelope(payload: unknown): Ship24Tracking | null {
  if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.trackings)) {
    return null;
  }

  const firstTracking = payload.data.trackings.find((item) => isRecord(item));
  return firstTracking as Ship24Tracking | null;
}

function firstShip24CarrierCode(value: string | string[] | null | undefined): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item.trim());
    return typeof first === "string" ? first.trim() : null;
  }

  return null;
}

function mapShip24Checkpoint(event: NonNullable<Ship24Tracking["events"]>[number]): TrackingCheckpoint {
  return {
    message: event.status?.trim() || "Tracking update received.",
    location: event.location?.trim() || null,
    status: event.statusMilestone?.trim() || event.statusCode?.trim() || event.statusCategory?.trim() || null,
    timestamp: event.occurrenceDatetime?.trim() || null,
  };
}

function getShip24StatisticsTimestamp(tracking: Ship24Tracking): string | null {
  const timestamps = tracking.statistics?.timestamps;
  if (!timestamps) {
    return null;
  }

  return (
    timestamps.deliveredDatetime ||
    timestamps.outForDeliveryDatetime ||
    timestamps.inTransitDatetime ||
    timestamps.infoReceivedDatetime ||
    timestamps.availableForPickupDatetime ||
    timestamps.failedAttemptDatetime ||
    timestamps.exceptionDatetime ||
    null
  );
}

function normalizeShip24TrackingSummary(
  tracking: Ship24Tracking,
  order: Pick<OrderRecord, "trackingCarrier" | "trackingNumber" | "orderNumber">
): TrackingSummary | null {
  const trackingNumber =
    tracking.tracker?.trackingNumber?.trim() ||
    tracking.shipment?.trackingNumbers?.find((entry) => entry.tn?.trim())?.tn?.trim() ||
    order.trackingNumber?.trim() ||
    "";

  if (!trackingNumber) {
    return null;
  }

  const carrierSlug =
    normalizeCarrierSlug(firstShip24CarrierCode(tracking.tracker?.courierCode)) ||
    normalizeCarrierSlug(order.trackingCarrier);

  const checkpoints = Array.isArray(tracking.events)
    ? tracking.events.map((event) => mapShip24Checkpoint(event))
    : [];

  const latestCheckpoint = checkpoints[0] ?? null;
  const carrierStatus =
    tracking.shipment?.statusMilestone?.trim() ||
    tracking.shipment?.statusCode?.trim() ||
    tracking.shipment?.statusCategory?.trim() ||
    latestCheckpoint?.status ||
    null;

  return {
    provider: "ship24",
    trackingNumber,
    carrierSlug,
    carrierName: humanizeCarrier(carrierSlug),
    carrierStatus,
    carrierStatusLabel: getTrackingStatusLabel(carrierStatus),
    message:
      latestCheckpoint?.message ||
      tracking.shipment?.delivery?.estimatedDeliveryDate?.trim() ||
      `Tracking is active for ${order.orderNumber}.`,
    trackingUrl: buildTrackingUrl(carrierSlug || order.trackingCarrier, trackingNumber),
    lastUpdatedAt: latestCheckpoint?.timestamp || getShip24StatisticsTimestamp(tracking),
    checkpoints,
  };
}

async function fetchShip24Summary(order: OrderRecord): Promise<TrackingSummary | null> {
  if (!order.trackingNumber) {
    return null;
  }

  const payload = await ship24Fetch<unknown>("/trackers/track", {
    method: "POST",
    body: JSON.stringify({
      trackingNumber: order.trackingNumber,
      shipmentReference: order.orderNumber,
      clientTrackerId: order.id,
    }),
  });

  const tracking = getShip24TrackingFromEnvelope(payload);
  return tracking ? normalizeShip24TrackingSummary(tracking, order) : null;
}

async function afterShipFetch<T>(path: string, init?: FetchInit): Promise<T> {
  const apiKey = getAfterShipApiKey();
  if (!apiKey) {
    throw new Error("AfterShip tracking sync is not configured.");
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

function getAfterShipTrackingFromEnvelope(payload: unknown): AfterShipTracking | null {
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

async function findAfterShipTracking(
  trackingNumber: string,
  carrierSlug?: string | null
): Promise<AfterShipTracking | null> {
  const params = new URLSearchParams({ tracking_numbers: trackingNumber });
  if (carrierSlug?.trim()) {
    params.set("slug", carrierSlug.trim());
  }

  const payload = await afterShipFetch<unknown>(`/trackings?${params.toString()}`);
  return getAfterShipTrackingFromEnvelope(payload);
}

async function createAfterShipTracking(order: OrderRecord): Promise<AfterShipTracking | null> {
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

  return getAfterShipTrackingFromEnvelope(payload);
}

function mapAfterShipCheckpoint(
  checkpoint: AfterShipTracking["latest_checkpoint"]
): TrackingCheckpoint {
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

function normalizeAfterShipTrackingSummary(
  tracking: AfterShipTracking,
  order?: Pick<OrderRecord, "trackingCarrier" | "trackingNumber">
): TrackingSummary {
  const checkpoints = Array.isArray(tracking.checkpoints)
    ? tracking.checkpoints.map((checkpoint) => mapAfterShipCheckpoint(checkpoint))
    : tracking.latest_checkpoint
      ? [mapAfterShipCheckpoint(tracking.latest_checkpoint)]
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

async function seventeenTrackFetch<T>(path: string, body: unknown): Promise<T> {
  const apiKey = get17TrackApiKey();
  if (!apiKey) {
    throw new Error("17TRACK sync is not configured.");
  }

  const response = await fetch(`${SEVENTEENTRACK_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "17token": apiKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`17TRACK request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

function get17TrackRecord(payload: unknown): Record<string, unknown> | null {
  if (Array.isArray(payload)) {
    const first = payload.find(isRecord);
    return first ?? null;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const data = payload.data;
  if (Array.isArray(data)) {
    const first = data.find(isRecord);
    return first ?? null;
  }

  if (isRecord(data)) {
    if (Array.isArray(data.accepted)) {
      const firstAccepted = data.accepted.find(isRecord);
      if (firstAccepted) {
        return firstAccepted;
      }
    }

    if (Array.isArray(data.track_list)) {
      const firstTrack = data.track_list.find(isRecord);
      if (firstTrack) {
        return firstTrack;
      }
    }

    return data;
  }

  return payload;
}

async function register17TrackTracking(order: OrderRecord): Promise<void> {
  if (!order.trackingNumber) {
    return;
  }

  const carrierCode = get17TrackCarrierCode(order.trackingCarrier);

  await seventeenTrackFetch<unknown>("/register", [
    {
      number: order.trackingNumber,
      ...(carrierCode ? { carrier: carrierCode } : {}),
      tag: order.orderNumber,
    },
  ]);
}

async function get17TrackTrackingInfo(order: OrderRecord): Promise<Record<string, unknown> | null> {
  if (!order.trackingNumber) {
    return null;
  }

  const carrierCode = get17TrackCarrierCode(order.trackingCarrier);
  const payload = await seventeenTrackFetch<unknown>("/gettrackinfo", [
    {
      number: order.trackingNumber,
      ...(carrierCode ? { carrier: carrierCode } : {}),
    },
  ]);

  return get17TrackRecord(payload);
}

function map17TrackCheckpoint(checkpoint: Record<string, unknown>): TrackingCheckpoint {
  const message =
    firstString(checkpoint, [
      ["description"],
      ["event"],
      ["message"],
      ["status_description"],
      ["content"],
    ]) || "Tracking update received.";

  const location =
    firstString(checkpoint, [["location"], ["address"], ["site"], ["checkpoint_location"]]) ||
    [firstString(checkpoint, [["city"]]), firstString(checkpoint, [["country"]])]
      .filter(Boolean)
      .join(", ") ||
    null;

  const timestamp =
    firstString(checkpoint, [
      ["time_iso"],
      ["time_utc"],
      ["time"],
      ["date"],
      ["date_time"],
      ["checkpoint_time"],
    ]) || null;

  const status =
    firstString(checkpoint, [["status"], ["tag"], ["sub_status"], ["checkpoint_status"]]) ||
    null;

  return {
    message,
    location,
    status,
    timestamp,
  };
}

function normalize17TrackStatus(status: string | null | undefined): string | null {
  if (!status) {
    return null;
  }

  const normalized = status.trim();
  return normalized || null;
}

function normalize17TrackTrackingSummary(
  rawRecord: Record<string, unknown>,
  order: OrderRecord
): TrackingSummary | null {
  const record = (getPath(rawRecord, ["track_info"]) as Record<string, unknown> | undefined) ?? rawRecord;

  const carrierStatus =
    normalize17TrackStatus(
      firstString(record, [
        ["tracking", "shipment_status"],
        ["shipment_status"],
        ["latest_status"],
        ["status"],
      ])
    ) ||
    normalize17TrackStatus(
      findFirstMatchingString(record, (candidate) =>
        Object.keys(TRACKING_STATUS_LABELS).includes(normalizeStatusKey(candidate))
      )
    );

  const rawCheckpoints =
    firstObjectArray(record, [
      ["tracking", "providers", 0, "events"],
      ["tracking", "events"],
      ["events"],
      ["checkpoints"],
    ]) ?? [];

  const checkpoints = rawCheckpoints.map((checkpoint) => map17TrackCheckpoint(checkpoint));
  const latestCheckpoint = checkpoints[0] ?? null;

  const carrierName =
    firstString(record, [
      ["tracking", "providers", 0, "provider", "name"],
      ["tracking", "provider", "name"],
      ["carrier_name"],
      ["carrier", "name"],
    ]) || humanizeCarrier(order.trackingCarrier);

  const message =
    firstString(record, [
      ["latest_event"],
      ["description"],
      ["status_description"],
      ["track", "z0", "z"],
    ]) || latestCheckpoint?.message || null;

  const trackingNumber =
    firstString(rawRecord, [["number"], ["tracking_number"]]) ||
    order.trackingNumber ||
    "";

  if (!trackingNumber) {
    return null;
  }

  return {
    provider: "17track",
    trackingNumber,
    carrierSlug: normalizeCarrierSlug(order.trackingCarrier),
    carrierName,
    carrierStatus,
    carrierStatusLabel: getTrackingStatusLabel(carrierStatus),
    message,
    trackingUrl: buildTrackingUrl(order.trackingCarrier, trackingNumber),
    lastUpdatedAt: latestCheckpoint?.timestamp || null,
    checkpoints,
  };
}

async function fetch17TrackSummary(order: OrderRecord): Promise<TrackingSummary | null> {
  let trackingRecord = await get17TrackTrackingInfo(order);
  let summary = trackingRecord
    ? normalize17TrackTrackingSummary(trackingRecord, order)
    : null;

  if (summary?.carrierStatus || summary?.checkpoints.length) {
    return summary;
  }

  await register17TrackTracking(order);
  trackingRecord = await get17TrackTrackingInfo(order);
  summary = trackingRecord
    ? normalize17TrackTrackingSummary(trackingRecord, order)
    : null;

  return summary;
}

export function getTrackingStatusLabel(tag: string | null): string {
  const normalized = normalizeStatusKey(tag);
  if (!normalized) {
    return "Tracking active";
  }

  return TRACKING_STATUS_LABELS[normalized] ?? tag!.replace(/_/g, " ");
}

function mapTrackingTagToOrderStatus(tag: string | null): OrderStatus | null {
  switch (normalizeStatusKey(tag)) {
    case "delivered":
      return "delivered";
    case "intransit":
    case "outfordelivery":
    case "availableforpickup":
    case "failedattempt":
    case "attemptfail":
    case "deliveryfailure":
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
  const provider = getTrackingProvider();

  if (!provider) {
    return directSummary;
  }

  try {
    if (provider === "ship24") {
      return (await fetchShip24Summary(order)) ?? directSummary;
    }

    if (provider === "17track") {
      return (await fetch17TrackSummary(order)) ?? directSummary;
    }

    let tracking = await findAfterShipTracking(order.trackingNumber, order.trackingCarrier);
    if (!tracking) {
      tracking = await createAfterShipTracking(order);
    }

    if (!tracking) {
      return directSummary;
    }

    return normalizeAfterShipTrackingSummary(tracking, order);
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
    trackingSummary.carrierSlug !== order.trackingCarrier &&
    !/^\d+$/.test(trackingSummary.carrierSlug)
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
    orderBy: desc(schema.orders.updatedAt),
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

