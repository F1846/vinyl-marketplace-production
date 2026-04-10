import { and, eq, isNotNull, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";

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
  "vinyl-marketplace-production/1.0 +https://www.federicoshop.de";
const REQUIRED_COLUMNS = [
  "listing_id",
  "artist",
  "title",
  "format",
  "release_id",
  "status",
  "price",
] as const;

export type DiscogsImportInspection = {
  headers: string[];
  requiredColumns: Array<{ name: string; found: boolean }>;
  totalRows: number;
  activeRows: number;
};

export type DiscogsImportSummary = DiscogsImportInspection & {
  imported: number;
  rowsWithImages: number;
  rowsWithoutImages: number;
  archived: number;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}

function parseCsv(input: string): { headers: string[]; rows: InventoryRow[] } {
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
    return { headers: [], rows: [] };
  }

  const [headerRow, ...dataRows] = rows;
  headerRow[0] = headerRow[0]?.replace(/^\uFEFF/, "") ?? "";

  return {
    headers: headerRow,
    rows: dataRows
      .filter((row) => row.some((value) => value.trim().length > 0))
      .map(
        (row) =>
          Object.fromEntries(
            headerRow.map((header, index) => [header, row[index] ?? ""])
          ) as unknown as InventoryRow
      ),
  };
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
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const waitMs = Math.max(0, 250 - (Date.now() - lastDiscogsRequestAt));
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    lastDiscogsRequestAt = Date.now();

    const response = await fetch(`${DISCOGS_API_BASE}/releases/${releaseId}`, {
      headers: {
        Authorization: `Discogs token=${token}`,
        "User-Agent": userAgent,
      },
      cache: "no-store",
    });

    if (response.ok) {
      return (await response.json()) as DiscogsRelease;
    }

    if (response.status === 404) {
      return null;
    }

    if (response.status === 429 && attempt < 3) {
      await sleep(attempt * 1000);
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

export function inspectDiscogsInventoryCsv(input: string): DiscogsImportInspection {
  const parsed = parseCsv(input);
  const activeRows = parsed.rows.filter((row) => toProductStatus(row.status) === "active");

  return {
    headers: parsed.headers,
    requiredColumns: REQUIRED_COLUMNS.map((name) => ({
      name,
      found: parsed.headers.includes(name),
    })),
    totalRows: parsed.rows.length,
    activeRows: activeRows.length,
  };
}

export async function importDiscogsInventoryCsv(input: string): Promise<DiscogsImportSummary> {
  requireEnv("DATABASE_URL");
  const discogsToken = requireEnv("DISCOGS_USER_TOKEN");
  const discogsUserAgent =
    process.env.DISCOGS_USER_AGENT?.trim() || DEFAULT_USER_AGENT;

  const inspection = inspectDiscogsInventoryCsv(input);
  const parsed = parseCsv(input);
  const catalogRows = parsed.rows.filter((row) => toProductStatus(row.status) === "active");

  if (catalogRows.length === 0) {
    throw new Error("No 'For Sale' rows were found in the uploaded CSV.");
  }

  if (inspection.requiredColumns.some((column) => !column.found)) {
    throw new Error("The uploaded CSV is missing one or more required Discogs columns.");
  }

  const d = db();
  const releaseCache = new Map<number, Promise<DiscogsRelease | null>>();
  const importedListingIds: string[] = [];
  let rowsWithImages = 0;
  let rowsWithoutImages = 0;

  for (const row of catalogRows) {
    const listingId = row.listing_id.trim();
    const releaseId = Number.parseInt(row.release_id, 10);

    if (!listingId || !Number.isFinite(releaseId)) {
      continue;
    }

    if (!releaseCache.has(releaseId)) {
      releaseCache.set(
        releaseId,
        fetchDiscogsRelease(releaseId, discogsToken, discogsUserAgent).catch(() => null)
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
      priceCents: toCents(row.price),
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
      version: sql`${schema.products.version} + 1`,
    };

    const [product] = await d
      .insert(schema.products)
      .values(insertValues)
      .onConflictDoUpdate({
        target: schema.products.discogsListingId,
        set: updateValues,
      })
      .returning({ id: schema.products.id });

    await d
      .delete(schema.productImages)
      .where(eq(schema.productImages.productId, product.id));

    if (imageUrls.length > 0) {
      await d.insert(schema.productImages).values(
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
  }

  const archivedProducts =
    importedListingIds.length > 0
      ? await d
          .update(schema.products)
          .set({
            status: "archived",
            stockQuantity: 0,
            version: sql`${schema.products.version} + 1`,
          })
          .where(
            and(
              isNotNull(schema.products.discogsListingId),
              notInArray(schema.products.discogsListingId, importedListingIds)
            )
          )
          .returning({ id: schema.products.id })
      : [];

  return {
    ...inspection,
    imported: importedListingIds.length,
    rowsWithImages,
    rowsWithoutImages,
    archived: archivedProducts.length,
  };
}

// ──────────────────────────────────────────────
// Discogs Collection CSV (export from profile/collection)
// Columns: Catalog#, artist, title, Label, format, Rating, Released,
//          release_id, CollectionFolder, Date Added,
//          Collection Media Condition, Collection Sleeve Condition,
//          Collection Notes, Collection Price Paid
// ──────────────────────────────────────────────

const COLLECTION_REQUIRED_COLUMNS = [
  "artist",
  "title",
  "release_id",
  "Collection Media Condition",
] as const;

interface CollectionRow {
  "Catalog#": string;
  artist: string;
  title: string;
  Label: string;
  format: string;
  Rating: string;
  Released: string;
  release_id: string;
  CollectionFolder: string;
  "Date Added": string;
  "Collection Media Condition": string;
  "Collection Sleeve Condition": string;
  "Collection Notes": string;
  "Collection Price Paid": string;
}

export function isCollectionCsv(input: string): boolean {
  const firstLine = input.split("\n")[0] ?? "";
  return firstLine.includes("Collection Media Condition");
}

export function inspectDiscogsCollectionCsv(input: string): DiscogsImportInspection {
  const parsed = parseCsv(input);
  return {
    headers: parsed.headers,
    requiredColumns: COLLECTION_REQUIRED_COLUMNS.map((name) => ({
      name,
      found: parsed.headers.includes(name),
    })),
    totalRows: parsed.rows.length,
    activeRows: parsed.rows.length,
  };
}

function descriptionForCollection(row: CollectionRow, release: DiscogsRelease | null): string {
  const parts: string[] = [];

  const releaseLine = [
    firstNonEmpty(release?.labels?.[0]?.name, row.Label),
    firstNonEmpty(release?.labels?.[0]?.catno, row["Catalog#"]),
    row.format.trim(),
  ]
    .filter(Boolean)
    .join(" / ");

  if (releaseLine) parts.push(releaseLine);

  const genres = [...(release?.genres ?? []), ...(release?.styles ?? [])]
    .map((v) => v.trim())
    .filter(Boolean);

  if (genres.length > 0) parts.push(`Genres: ${Array.from(new Set(genres)).join(", ")}`);

  const conditions = [
    row["Collection Media Condition"].trim() ? `Media: ${row["Collection Media Condition"].trim()}` : null,
    row["Collection Sleeve Condition"].trim() && row["Collection Sleeve Condition"].trim() !== "Generic"
      ? `Sleeve: ${row["Collection Sleeve Condition"].trim()}`
      : null,
  ].filter(Boolean);

  if (conditions.length > 0) parts.push(conditions.join(" | "));

  const notes = row["Collection Notes"].trim();
  if (notes) parts.push(notes);
  else if (release?.notes?.trim()) parts.push(release.notes.trim().replace(/\s+/g, " ").slice(0, 500));

  return parts.join("\n\n") || `${row.artist.trim()} - ${row.title.trim()}`;
}

export async function importDiscogsCollectionCsv(input: string): Promise<DiscogsImportSummary> {
  requireEnv("DATABASE_URL");
  const discogsToken = requireEnv("DISCOGS_USER_TOKEN");
  const discogsUserAgent = process.env.DISCOGS_USER_AGENT?.trim() || DEFAULT_USER_AGENT;

  const inspection = inspectDiscogsCollectionCsv(input);

  if (inspection.requiredColumns.some((c) => !c.found)) {
    throw new Error("The uploaded CSV is missing one or more required collection columns.");
  }

  const parsed = parseCsv(input);
  const rows = parsed.rows as unknown as CollectionRow[];

  if (rows.length === 0) {
    throw new Error("No rows found in the collection CSV.");
  }

  const d = db();
  const releaseCache = new Map<number, Promise<DiscogsRelease | null>>();
  let imported = 0;
  let rowsWithImages = 0;
  let rowsWithoutImages = 0;

  for (const row of rows) {
    const releaseId = Number.parseInt(row.release_id, 10);
    if (!Number.isFinite(releaseId)) continue;

    if (!releaseCache.has(releaseId)) {
      releaseCache.set(
        releaseId,
        fetchDiscogsRelease(releaseId, discogsToken, discogsUserAgent).catch(() => null)
      );
    }

    const release = await releaseCache.get(releaseId)!;
    const imageUrls = imageUrlsFor(release);

    const mediaCondition = toMediaCondition(row["Collection Media Condition"]);
    const sleeveCondition = toMediaCondition(row["Collection Sleeve Condition"]);
    const pricePaid = row["Collection Price Paid"].trim();

    const insertValues = {
      id: crypto.randomUUID(),
      artist: row.artist.trim(),
      title: row.title.trim(),
      format: toFormat(row.format),
      genre: toGenre(release),
      priceCents: pricePaid ? toCents(pricePaid) : 0,
      stockQuantity: 1,
      conditionMedia: mediaCondition,
      conditionSleeve: sleeveCondition,
      pressingLabel: firstNonEmpty(release?.labels?.[0]?.name, row.Label),
      pressingYear: safeYear(release?.year) ?? (row.Released ? Number.parseInt(row.Released, 10) : null),
      pressingCatalogNumber: firstNonEmpty(release?.labels?.[0]?.catno, row["Catalog#"]),
      discogsListingId: null,
      discogsReleaseId: releaseId,
      description: descriptionForCollection(row, release),
      status: "archived" as const, // In collection = not for sale until explicitly put on sale
    };

    const [product] = await d
      .insert(schema.products)
      .values(insertValues)
      .returning({ id: schema.products.id });

    if (imageUrls.length > 0) {
      await d.insert(schema.productImages).values(
        imageUrls.map((url, sortOrder) => ({
          id: crypto.randomUUID(),
          productId: product.id,
          url,
          sortOrder,
        }))
      );
      rowsWithImages += 1;
    } else {
      rowsWithoutImages += 1;
    }

    imported += 1;
  }

  return {
    ...inspection,
    imported,
    rowsWithImages,
    rowsWithoutImages,
    archived: 0,
  };
}
