import dotenv from "dotenv";
import { db, schema } from "../db";

dotenv.config({ path: ".env.local" });
dotenv.config();

type ShippingFormat = "vinyl" | "cassette" | "cd";
type ShippingRateInput = {
  countryCode: string;
  formatScope: ShippingFormat;
  minQuantity: number;
  maxQuantity: number | null;
  rateCents: number;
};

const EUROPE_GROUP_CODE = "EUROPE";
const UK_SWITZERLAND_GROUP_CODE = "GB_CH";
const PALESTINE_CODE = "PS";

function addRate(
  rates: ShippingRateInput[],
  countryCode: string,
  formatScope: ShippingFormat,
  minQuantity: number,
  maxQuantity: number | null,
  rateCents: number
) {
  rates.push({ countryCode, formatScope, minQuantity, maxQuantity, rateCents });
}

function addIncrementalBands(
  rates: ShippingRateInput[],
  countryCode: string,
  formatScope: ShippingFormat,
  baseBandMaxQuantity: number,
  baseRateCents: number,
  incrementCents: number,
  finalQuantity: number
) {
  addRate(rates, countryCode, formatScope, 1, baseBandMaxQuantity, baseRateCents);

  for (let quantity = baseBandMaxQuantity + 1; quantity <= finalQuantity; quantity += 1) {
    addRate(
      rates,
      countryCode,
      formatScope,
      quantity,
      quantity,
      baseRateCents + (quantity - baseBandMaxQuantity) * incrementCents
    );
  }
}

async function main() {
  const rates: ShippingRateInput[] = [];

  addRate(rates, "DE", "vinyl", 1, 5, 600);
  addRate(rates, "DE", "vinyl", 6, null, 1000);
  addRate(rates, "DE", "cassette", 1, null, 400);
  addRate(rates, "DE", "cd", 1, null, 400);

  addIncrementalBands(rates, EUROPE_GROUP_CODE, "vinyl", 3, 1400, 200, 20);
  addRate(rates, EUROPE_GROUP_CODE, "cassette", 1, null, 1000);
  addRate(rates, EUROPE_GROUP_CODE, "cd", 1, null, 1000);

  addIncrementalBands(rates, UK_SWITZERLAND_GROUP_CODE, "vinyl", 2, 2100, 200, 20);

  addRate(rates, "ALL", "cassette", 1, null, 1400);
  addRate(rates, "ALL", "cd", 1, null, 1400);

  addRate(rates, PALESTINE_CODE, "vinyl", 1, 10, 3000);
  addRate(rates, PALESTINE_CODE, "cassette", 1, 10, 3000);
  addRate(rates, PALESTINE_CODE, "cd", 1, 10, 3000);

  const database = db();
  await database.delete(schema.shippingRates);
  await database.insert(schema.shippingRates).values(
    rates.map((rate) => ({
      id: crypto.randomUUID(),
      ...rate,
    }))
  );

  console.log(`Applied ${rates.length} shipping rates.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
