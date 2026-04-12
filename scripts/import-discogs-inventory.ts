import { readFile } from "node:fs/promises";
import dotenv from "dotenv";
import { and, eq, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { productImages, products } from "../db/schema.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

type ProductFormat = "vinyl" | "cassette" | "cd";
type ProductStatus = "active" | "sold_out" | "archived";
type MediaCondition = "M" | "NM" | "VG+" | "VG" | "G" | "P";

interface InventoryRow {
  listing_id: string;
  artist: string;
  title: string;
  label: string;
  catno: string;
  format: string;
  release_id: string;
  status: string;
  price: string;
  listed: string;
  comments: string;
  media_condition: string;
  sleeve_condition: string;
  accept_offer: string;
  external_id: string;
  weight: string;
  format_quantity: string;
  location: string;
}

interface DiscogsRelease {
  id: number;
  year?: number;
  genres?: string[];
  styles?: string[];
  notes?: string;
  labels?: Array<{
    name?: string;
    catno?: string;
  }>;
  images?: Array<{
    type?: string;
    uri?: string;
    uri150?: string;
  }>;
}

const DISCOGS_API_BASE = "https://api.discogs.com";
const DEFAULT_USER_AGENT =
  "federico-shop/1.0 +https://www.federicoshop.de";
const MIN_DISCOGS_REQUEST_INTERVAL_MS = 1100;

function usage(): string {
  return [
    'Usage: npm run catalog:import-discogs -- "C:\\path\\to\\inventory.csv"',
    '       npm run catalog:import-discogs -- "C:\\path\\to\\inventory.csv" --replace-catalog --price-factor=0.9',
    "",
    "Required env vars:",
    "  DATABASE_URL",
    "  DISCOGS_USER_TOKEN",
    "",
    "Optional env vars:",
    "  DISCOGS_USER_AGENT",
  ].join("\n");
}

type ImportOptions = {
  csvPath: string;
  replaceCatalog: boolean;
  priceFactor: number;
};

function parseArgs(argv: string[]): ImportOptions {
  const args = argv.slice(2);
  const csvPath = args.find((arg) => !arg.startsWith("--"));

  if (!csvPath) {
    throw new Error(usage());
  }

  const replaceCatalog = args.includes("--replace-catalog");
  const priceFactorArg = args.find((arg) => arg.startsWith("--price-factor="));
  const priceFactor = priceFactorArg
    ? Number.parseFloat(priceFactorArg.slice("--price-factor=".length))
    : 1;

  if (!Number.isFinite(priceFactor) || priceFactor <= 0) {
    throw new Error("Price factor must be a positive number.");
  }

  return {
    csvPath,
    replaceCatalog,
    priceFactor,
  };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}

function parseCsv(input: string): InventoryRow[] {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length < 2) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  headerRow[0] = headerRow[0]?.replace(/^\uFEFF/, "") ?? "";

  return dataRows
    .filter((row) => row.some((value) => value.trim().length > 0))
    .map((row) =>
      Object.fromEntries(
        headerRow.map((header, index) => [header, row[index] ?? ""])
      ) as unknown as InventoryRow
    );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastDiscogsRequestAt = 0;

async function fetchDiscogsRelease(
  releaseId: number,
  token: string,
  userAgent: string
): Promise<DiscogsRelease | null> {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const waitMs = Math.max(
      0,
      MIN_DISCOGS_REQUEST_INTERVAL_MS - (Date.now() - lastDiscogsRequestAt)
    );
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    lastDiscogsRequestAt = Date.now();

    const response = await fetch(`${DISCOGS_API_BASE}/releases/${releaseId}`, {
      headers: {
        Authorization: `Discogs token=${token}`,
        "User-Agent": userAgent,
      },
    });

    if (response.ok) {
      return (await response.json()) as DiscogsRelease;
    }

    if (response.status === 404) {
      return null;
    }

    if (response.status === 429 && attempt < 5) {
      const retryAfterSeconds = Number.parseInt(
        response.headers.get("Retry-After") ?? "",
        10
      );
      const retryDelayMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : attempt * 2000;
      await sleep(retryDelayMs);
      continue;
    }

    throw new Error(
      `Discogs lookup failed for release ${releaseId}: ${response.status} ${response.statusText}`
    );
  }

  return null;
}

function toFormat(value: string): ProductFormat {
  const normalized = value.toLowerCase();

  if (normalized.includes("cass")) {
    return "cassette";
  }

  if (normalized.includes("cd")) {
    return "cd";
  }

  return "vinyl";
}

function toMediaCondition(value: string): MediaCondition | null {
  const normalized = value.trim();

  if (!normalized || normalized === "Generic" || normalized === "Not Graded") {
    return null;
  }

  if (normalized.includes("(NM")) return "NM";
  if (normalized.includes("(VG+)")) return "VG+";
  if (normalized.includes("(VG)")) return "VG";
  if (normalized.includes("(G)")) return "G";
  if (normalized.includes("(P)")) return "P";
  if (normalized.includes("(M)")) return "M";

  return null;
}

function toProductStatus(value: string): ProductStatus {
  switch (value.trim().toLowerCase()) {
    case "for sale":
      return "active";
    case "sold":
      return "sold_out";
    case "draft":
      return "archived";
    default:
      return "archived";
  }
}

function toCents(value: string): number {
  return Math.round(Number.parseFloat(value || "0") * 100);
}

function applyPriceFactor(priceCents: number, factor: number): number {
  return Math.max(0, Math.round(priceCents * factor));
}

function safeYear(value: number | undefined): number | null {
  if (!value || value < 1000) {
    return null;
  }

  return value;
}

function firstNonEmpty(...values: Array<string | number | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    const normalized = value?.toString().trim();
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function toGenre(release: DiscogsRelease | null): string {
  const genre = release?.styles?.find(Boolean) ?? release?.genres?.find(Boolean) ?? "Electronic";
  return genre.slice(0, 100);
}

function descriptionFor(row: InventoryRow, release: DiscogsRelease | null): string {
  const parts: string[] = [];

  const releaseLine = [
    firstNonEmpty(release?.labels?.[0]?.name, row.label),
    firstNonEmpty(release?.labels?.[0]?.catno, row.catno),
    row.format.trim(),
  ]
    .filter(Boolean)
    .join(" / ");

  if (releaseLine) {
    parts.push(releaseLine);
  }

  const genres = [...(release?.genres ?? []), ...(release?.styles ?? [])]
    .map((value) => value.trim())
    .filter(Boolean);

  if (genres.length > 0) {
    parts.push(`Genres: ${Array.from(new Set(genres)).join(", ")}`);
  }

  const conditions = [
    row.media_condition.trim() ? `Media: ${row.media_condition.trim()}` : null,
    row.sleeve_condition.trim() && row.sleeve_condition.trim() !== "Generic"
      ? `Sleeve: ${row.sleeve_condition.trim()}`
      : null,
  ].filter(Boolean);

  if (conditions.length > 0) {
    parts.push(conditions.join(" | "));
  }

  const comments = row.comments.trim();
  if (comments) {
    parts.push(comments);
  } else if (release?.notes?.trim()) {
    parts.push(release.notes.trim().replace(/\s+/g, " ").slice(0, 500));
  }

  return parts.join("\n\n") || `${row.artist.trim()} - ${row.title.trim()}`;
}

function imageUrlsFor(release: DiscogsRelease | null): string[] {
  if (!release?.images?.length) {
    return [];
  }

  const ordered = [...release.images].sort((left, right) => {
    if (left.type === "primary" && right.type !== "primary") return -1;
    if (left.type !== "primary" && right.type === "primary") return 1;
    return 0;
  });

  const urls = ordered
    .map((image) => image.uri?.trim() ?? image.uri150?.trim() ?? "")
    .filter(Boolean);

  return Array.from(new Set(urls)).slice(0, 4);
}

async function main() {
  const { csvPath, replaceCatalog, priceFactor } = parseArgs(process.argv);

  requireEnv("DATABASE_URL");
  const discogsToken = requireEnv("DISCOGS_USER_TOKEN");
  const discogsUserAgent =
    process.env.DISCOGS_USER_AGENT?.trim() || DEFAULT_USER_AGENT;

  const file = await readFile(csvPath, "utf8");
  const rows = parseCsv(file);
  const catalogRows = rows.filter((row) => toProductStatus(row.status) === "active");

  if (catalogRows.length === 0) {
    throw new Error("No 'For Sale' rows were found in the supplied inventory CSV.");
  }

  const d = db();
  const releaseCache = new Map<number, Promise<DiscogsRelease | null>>();
  const importedListingIds: string[] = [];
  let rowsWithImages = 0;
  let rowsWithoutImages = 0;

  console.log(`Loaded ${rows.length} rows from ${csvPath}`);
  console.log(`Importing ${catalogRows.length} active catalog rows from Discogs inventory...`);
  if (priceFactor !== 1) {
    console.log(`Applying price factor ${priceFactor.toFixed(2)} to imported prices.`);
  }
  if (replaceCatalog) {
    console.log("Replacement mode enabled: products not present in the CSV will be archived.");
  }

  for (const [index, row] of catalogRows.entries()) {
    const listingId = row.listing_id.trim();
    const releaseId = Number.parseInt(row.release_id, 10);

    if (!listingId) {
      console.warn(`Skipping row ${index + 1}: missing listing_id`);
      continue;
    }

    if (!Number.isFinite(releaseId)) {
      console.warn(`Skipping listing ${listingId}: invalid release_id "${row.release_id}"`);
      continue;
    }

    if (!releaseCache.has(releaseId)) {
      releaseCache.set(
        releaseId,
        fetchDiscogsRelease(releaseId, discogsToken, discogsUserAgent).catch(
          (error: unknown) => {
            console.warn(
              `Discogs metadata lookup failed for release ${releaseId}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
            return null;
          }
        )
      );
    }

    const release = await releaseCache.get(releaseId)!;
    const imageUrls = imageUrlsFor(release);
    const insertValues = {
      id: crypto.randomUUID(),
      artist: row.artist.trim(),
      title: row.title.trim(),
      format: toFormat(row.format),
      genre: toGenre(release),
      priceCents: applyPriceFactor(toCents(row.price), priceFactor),
      stockQuantity: 1,
      conditionMedia: toMediaCondition(row.media_condition),
      conditionSleeve: toMediaCondition(row.sleeve_condition),
      pressingLabel: firstNonEmpty(release?.labels?.[0]?.name, row.label),
      pressingYear: safeYear(release?.year),
      pressingCatalogNumber: firstNonEmpty(release?.labels?.[0]?.catno, row.catno),
      discogsListingId: listingId,
      discogsReleaseId: releaseId,
      description: descriptionFor(row, release),
      status: "active" as const,
      deletedAt: null,
    };

    const updateValues = {
      artist: insertValues.artist,
      title: insertValues.title,
      format: insertValues.format,
      genre: insertValues.genre,
      priceCents: insertValues.priceCents,
      stockQuantity: insertValues.stockQuantity,
      conditionMedia: insertValues.conditionMedia,
      conditionSleeve: insertValues.conditionSleeve,
      pressingLabel: insertValues.pressingLabel,
      pressingYear: insertValues.pressingYear,
      pressingCatalogNumber: insertValues.pressingCatalogNumber,
      discogsReleaseId: insertValues.discogsReleaseId,
      description: insertValues.description,
      status: insertValues.status,
      deletedAt: null,
      version: sql`${products.version} + 1`,
    };

    const [product] = await d
      .insert(products)
      .values(insertValues)
      .onConflictDoUpdate({
        target: products.discogsListingId,
        set: updateValues,
      })
      .returning({ id: products.id });

    await d.delete(productImages).where(eq(productImages.productId, product.id));

    if (imageUrls.length > 0) {
      await d.insert(productImages).values(
        imageUrls.map((url, sortOrder) => ({
          id: crypto.randomUUID(),
          productId: product.id,
          url,
          sortOrder,
        }))
      );
    }

    importedListingIds.push(listingId);

    if (imageUrls.length > 0) {
      rowsWithImages += 1;
    } else {
      rowsWithoutImages += 1;
    }

    if ((index + 1) % 25 === 0 || index === catalogRows.length - 1) {
      console.log(`  Synced ${index + 1}/${catalogRows.length} listings...`);
    }
  }

  const archivedProducts =
    importedListingIds.length > 0
      ? await d
          .update(products)
          .set({
            status: "archived",
            stockQuantity: 0,
            version: sql`${products.version} + 1`,
          })
          .where(
            replaceCatalog
              ? or(
                  isNull(products.discogsListingId),
                  notInArray(products.discogsListingId, importedListingIds)
                )
              : and(
                  isNotNull(products.discogsListingId),
                  notInArray(products.discogsListingId, importedListingIds)
                )
          )
          .returning({ id: products.id })
      : [];

  console.log("");
  console.log(`Imported/updated ${importedListingIds.length} active Discogs listings.`);
  console.log(`Attached cover art to ${rowsWithImages} products.`);
  console.log(`Imported ${rowsWithoutImages} products without cover art.`);
  console.log(`Archived ${archivedProducts.length} previously imported Discogs listings.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
