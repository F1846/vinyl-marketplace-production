"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import { isShippingRuleCountryCode, normalizeCountryCode } from "@/lib/shipping";
import type { ShippingRateFormat } from "@/types/shipping";

const SHIPPING_RATE_FORMATS = new Set<ShippingRateFormat>(["all", "vinyl", "cassette", "cd"]);

type ShippingActionState = {
  error: string | null;
  success: boolean;
};

function parsePositiveInteger(value: string | File | null): number {
  return Number.parseInt(typeof value === "string" ? value : "", 10);
}

export async function createShippingRateAction(
  _prevState: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  await requireAuthenticatedAdmin();

  const countryCode = normalizeCountryCode(String(formData.get("countryCode") ?? ""));
  const formatScope = String(formData.get("formatScope") ?? "") as ShippingRateFormat;
  const minQuantity = parsePositiveInteger(formData.get("minQuantity"));
  const maxQuantityRaw = String(formData.get("maxQuantity") ?? "").trim();
  const maxQuantity = maxQuantityRaw ? Number.parseInt(maxQuantityRaw, 10) : null;
  const rateCents = parsePositiveInteger(formData.get("rateCents"));

  if (!isShippingRuleCountryCode(countryCode)) {
    return { error: "Country must be a 2-letter code like DE, FR, or PS, or a group like ALL, EUROPE, or GB_CH.", success: false };
  }
  if (!SHIPPING_RATE_FORMATS.has(formatScope)) {
    return { error: "Choose a valid format scope.", success: false };
  }
  if (!Number.isInteger(minQuantity) || minQuantity < 1) {
    return { error: "Minimum quantity must be at least 1.", success: false };
  }
  if (maxQuantity !== null && (!Number.isInteger(maxQuantity) || maxQuantity < minQuantity)) {
    return { error: "Maximum quantity must be blank or greater than or equal to the minimum.", success: false };
  }
  if (!Number.isInteger(rateCents) || rateCents < 0) {
    return { error: "Rate must be 0 or more.", success: false };
  }

  await db().insert(schema.shippingRates).values({
    id: crypto.randomUUID(),
    countryCode,
    formatScope,
    minQuantity,
    maxQuantity,
    rateCents,
  });

  revalidatePath("/admin/shipping");
  revalidatePath("/cart");
  return { error: null, success: true };
}

export async function deleteShippingRate(id: string): Promise<void> {
  await requireAuthenticatedAdmin();

  await db().delete(schema.shippingRates).where(eq(schema.shippingRates.id, id));
  revalidatePath("/admin/shipping");
  revalidatePath("/cart");
}
