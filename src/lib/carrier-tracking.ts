// Pure utility — no server-only, no DB imports. Safe to test with Node directly.

const CARRIER_TRACKING_URLS: Record<string, string> = {
  dhl: "https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id={trackingNumber}",
  "deutsche-post":
    "https://www.deutschepost.de/sendung/simpleQuery.html?locale=en_GB&shipmentId={trackingNumber}",
  dpd: "https://tracking.dpd.de/status/en_US/parcel/{trackingNumber}",
  gls: "https://gls-group.com/DE/en/parcel-tracking?match={trackingNumber}",
  ups: "https://www.ups.com/track?tracknum={trackingNumber}",
  fedex: "https://www.fedex.com/fedextrack/?trknbr={trackingNumber}",
  usps: "https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}",
  hermes:
    "https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/?trackingnumber={trackingNumber}",
  "royal-mail":
    "https://www.royalmail.com/track-your-item#/tracking-results/{trackingNumber}",
  posteitaliane:
    "https://www.poste.it/cerca/index.html#/risultati-spedizioni/{trackingNumber}",
  colissimo: "https://www.laposte.fr/outils/suivre-vos-envois?code={trackingNumber}",
  bpost: "https://track.bpost.cloud/track/items?itemIdentifier={trackingNumber}",
};

export function normalizeCarrierSlug(value: string | null | undefined): string | null {
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
    // normalizeCarrierSlug lowercases the URL so {trackingNumber} becomes
    // {trackingnumber} — match and replace case-insensitively.
    if (/\{trackingnumber\}/i.test(normalizedCarrier)) {
      return normalizedCarrier.replace(
        /\{trackingnumber\}/gi,
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

  // Do not leak tracking numbers to third-party search engines when the
  // carrier slug is unknown. Return null — keep the number visible in the
  // UI/email but only generate direct carrier URLs we can account for.
  return null;
}
