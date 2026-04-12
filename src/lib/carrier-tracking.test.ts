import assert from "node:assert/strict";
import test from "node:test";
import { buildTrackingUrl } from "./carrier-tracking";

test("buildTrackingUrl returns direct URLs for known carriers", () => {
  const url = buildTrackingUrl("dhl", "JD014600003828281788");

  assert.equal(
    url,
    "https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=JD014600003828281788"
  );
});

test("buildTrackingUrl preserves explicit custom tracking URLs", () => {
  const url = buildTrackingUrl(
    "https://carrier.example/track/{trackingNumber}",
    "AB 12/34"
  );

  assert.equal(url, "https://carrier.example/track/AB%2012%2F34");
});

test("buildTrackingUrl returns null for unknown carriers instead of a Google search URL", () => {
  const url = buildTrackingUrl("mystery-carrier", "TRACK-1234");

  assert.equal(url, null);
});
