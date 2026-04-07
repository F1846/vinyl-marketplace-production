import { NextResponse } from "next/server";
import { getShippingCountryOptions } from "@/lib/shipping";

export async function GET() {
  const countries = await getShippingCountryOptions();
  return NextResponse.json({ countries });
}
