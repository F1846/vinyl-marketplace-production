import "server-only";

import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getOrderStatusRank,
  type OrderStatus,
  type TrackingCheckpoint,
  type TrackingSummary,
} from "@/types/order";

const AFTERSHIP_BASE_URL = "https://api.aftership.com/tracking/2025-07";
const SEVENTEENTRACK_BASE_URL = "https://api.17track.net/track/v2";
const SHIP24_BASE_URL = "https://api.ship24.com/public/v1";

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

function get17TrackCarrierCode(value: string | null | undefined): number | null {
  const normalized = value?.trim();
  if (!normalized || !/^\d+$/.test(normalized)) {
    return null;
  }

  return Number(normalized);
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

  // Do not leak tracking numbers to third-party search engines when
  // the carrier slug is unknown. Keep the number visible in the UI/email,
  // but only generate direct carrier URLs we can account for.
  return null;
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
