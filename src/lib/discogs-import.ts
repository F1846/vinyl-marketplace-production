import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { buildProductIdentityWhere, resolveProductStatus } from "@/lib/product-admin";

type ProductFormat = "vinyl" | "cassette" | "cd";
type ProductStatus = "active" | "sold_out" | "archived";
type MediaCondition = "M" | "NM" | "VG+" | "VG" | "G" | "P";

// Keys are lowercase-normalized (matching parseCsv output)
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

// Keys are lowercase-normalized (matching parseCsv output)
interface CollectionRow {
  "catalog#": string;
  artist: string;
  title: string;
  label: string;
  format: string;
  rating: string;
  released: string;
  release_id: string;
  collectionfolder: string;
  "date added": string;
  "collection media condition": string;
  "collection sleeve condition": string;
  "collection notes": string;
  "collection price paid": string;
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

// All lowercase â€” matched against lowercased CSV headers
const REQUIRED_COLUMNS = [
  "listing_id",
  "artist",
  "title",
  "format",
  "release_id",
  "status",
  "price",
] as const;

// All lowercase â€” matched against lowercased CSV headers
const COLLECTION_REQUIRED_COLUMNS = [
  "artist",
  "title",
  "release_id",
  "collection media condition",
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

/**
 * Parses CSV input and returns original headers (for display) plus rows
 * keyed by lowercase-normalized header names (for case-insensitive matching).
 */
function parseCsv(input: string): { headers: string[]; rows: Record<string, string>[] } {
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

  // Normalize headers to lowercase for case-insensitive key matching
  const normalizedKeys = headerRow.map((h) => h.toLowerCase().trim());

  return {
    headers: headerRow, // keep originals for display
    rows: dataRows
      .filter((row) => row.some((value) => value.trim().length > 0))
      .map((row) =>
        Object.fromEntries(
          normalizedKeys.map((key, index) => [key, row[index] ?? ""])
        )
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
      `Image lookup failed for release ${releaseId}: ${response.status} ${response.statusText}`
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
  const n = Math.round(Number.parseFloat(value || "0") * 100);
  return Number.isFinite(n) ? n : 0;
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

type InventoryProductDraft = {
  id: string;
  artist: string;
  title: string;
  format: ProductFormat;
  genre: string;
  priceCents: number;
  stockQuantity: number;
  conditionMedia: MediaCondition | null;
  conditionSleeve: MediaCondition | null;
  pressingLabel: string | null;
  pressingYear: number | null;
  pressingCatalogNumber: string | null;
  discogsListingId: string | null;
  discogsReleaseId: number;
  description: string;
  status: ProductStatus;
};

type InventoryImportGroup = {
  key: string;
  listingIds: string[];
  imageUrls: string[];
  product: InventoryProductDraft;
};

function normalizeIdentityValue(value: string | number | null | undefined): string {
  if (value == null) {
    return "";
  }

  return String(value).trim().toLowerCase();
}

function buildProductIdentityKey(input: {
  artist: string;
  title: string;
  format: ProductFormat;
  pressingYear: number | null;
  pressingLabel: string | null;
  pressingCatalogNumber: string | null;
  conditionMedia: MediaCondition | null;
  conditionSleeve: MediaCondition | null;
}) {
  return [
    normalizeIdentityValue(input.artist),
    normalizeIdentityValue(input.title),
    normalizeIdentityValue(input.format),
    normalizeIdentityValue(input.pressingYear),
    normalizeIdentityValue(input.pressingLabel),
    normalizeIdentityValue(input.pressingCatalogNumber),
    normalizeIdentityValue(input.conditionMedia),
    normalizeIdentityValue(input.conditionSleeve),
  ].join("::");
}

function buildInventoryDraft(
  row: InventoryRow,
  release: DiscogsRelease | null,
  targetStatus: "active" | "archived"
): InventoryProductDraft {
  return {
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
    discogsListingId: row.listing_id.trim() || null,
    discogsReleaseId: Number.parseInt(row.release_id, 10),
    description: descriptionFor(row, release),
    status: targetStatus,
  };
}

function productIdentityFromDraft(product: InventoryProductDraft) {
  return buildProductIdentityKey(product);
}

function productIdentityFromRecord(product: {
  artist: string;
  title: string;
  format: ProductFormat;
  pressingYear: number | null;
  pressingLabel: string | null;
  pressingCatalogNumber: string | null;
  conditionMedia: MediaCondition | null;
  conditionSleeve: MediaCondition | null;
}) {
  return buildProductIdentityKey(product);
}

function buildProductMatchWhere(product: InventoryProductDraft) {
  return buildProductIdentityWhere({
    artist: product.artist,
    title: product.title,
    format: product.format,
    pressingYear: product.pressingYear,
    pressingLabel: product.pressingLabel,
    pressingCatalogNumber: product.pressingCatalogNumber,
    conditionMedia: product.conditionMedia,
    conditionSleeve: product.conditionSleeve,
  });
}

async function buildInventoryImportGroups(input: {
  rows: InventoryRow[];
  targetStatus: "active" | "archived";
  discogsToken: string;
  discogsUserAgent: string;
}) {
  const releaseCache = new Map<number, Promise<DiscogsRelease | null>>();
  const groups = new Map<string, InventoryImportGroup>();

  for (const row of input.rows) {
    const listingId = row.listing_id.trim();
    const releaseId = Number.parseInt(row.release_id, 10);
    if (!listingId || !Number.isFinite(releaseId)) {
      continue;
    }

    if (!releaseCache.has(releaseId)) {
      releaseCache.set(
        releaseId,
        fetchDiscogsRelease(releaseId, input.discogsToken, input.discogsUserAgent).catch(
          () => null
        )
      );
    }

    const release = await releaseCache.get(releaseId)!;
    const product = buildInventoryDraft(row, release, input.targetStatus);
    const key = productIdentityFromDraft(product);
    const imageUrls = imageUrlsFor(release);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.product.stockQuantity += 1;
      existingGroup.listingIds.push(listingId);
      continue;
    }

    groups.set(key, {
      key,
      listingIds: [listingId],
      imageUrls,
      product,
    });
  }

  return [...groups.values()].map((group) => ({
    ...group,
    listingIds: [...new Set(group.listingIds)].sort(),
  }));
}

export function inspectDiscogsInventoryCsv(input: string): DiscogsImportInspection {
  const parsed = parseCsv(input);
  const rows = parsed.rows as unknown as InventoryRow[];
  const activeRows = rows.filter((row) => toProductStatus(row.status) === "active");

  return {
    headers: parsed.headers,
    requiredColumns: REQUIRED_COLUMNS.map((name) => ({
      name,
      found: parsed.headers.some((h) => h.toLowerCase().trim() === name),
    })),
    totalRows: parsed.rows.length,
    activeRows: activeRows.length,
  };
}

export async function importDiscogsInventoryCsv(
  input: string,
  targetStatus: "active" | "archived" = "active"
): Promise<DiscogsImportSummary> {
  requireEnv("DATABASE_URL");
  const discogsToken = requireEnv("DISCOGS_USER_TOKEN");
  const discogsUserAgent =
    process.env.DISCOGS_USER_AGENT?.trim() || DEFAULT_USER_AGENT;

  const inspection = inspectDiscogsInventoryCsv(input);
  const parsed = parseCsv(input);
  const catalogRows = (parsed.rows as unknown as InventoryRow[]).filter(
    (row) => toProductStatus(row.status) === "active"
  );

  if (catalogRows.length === 0) {
    throw new Error("No 'For Sale' rows were found in the uploaded CSV.");
  }

  if (inspection.requiredColumns.some((column) => !column.found)) {
    throw new Error("The uploaded CSV is missing one or more required columns.");
  }

  const d = db();
  const groups = await buildInventoryImportGroups({
    rows: catalogRows,
    targetStatus,
    discogsToken,
    discogsUserAgent,
  });
  const importedListingIds = groups.flatMap((group) => group.listingIds);
  const importedKeys = new Set(groups.map((group) => group.key));
  let rowsWithImages = 0;
  let rowsWithoutImages = 0;

  for (const group of groups) {
    const representativeListingId = group.listingIds[0] ?? null;
    const [existingByListing, existingByIdentity] = await Promise.all([
      representativeListingId
        ? d.query.products.findFirst({
            where: and(
              eq(schema.products.discogsListingId, representativeListingId),
              isNull(schema.products.deletedAt)
            ),
            columns: { id: true, discogsListingId: true },
          })
        : Promise.resolve(null),
      d.query.products.findFirst({
        where: buildProductMatchWhere(group.product),
        columns: { id: true, discogsListingId: true },
      }),
    ]);
    const existingProduct = existingByListing ?? existingByIdentity;
    let productId = existingProduct?.id;

    if (existingProduct) {
      await d
        .update(schema.products)
        .set({
          artist: group.product.artist,
          title: group.product.title,
          format: group.product.format,
          genre: group.product.genre,
          priceCents: group.product.priceCents,
          stockQuantity: group.product.stockQuantity,
          conditionMedia: group.product.conditionMedia,
          conditionSleeve: group.product.conditionSleeve,
          pressingLabel: group.product.pressingLabel,
          pressingYear: group.product.pressingYear,
          pressingCatalogNumber: group.product.pressingCatalogNumber,
          discogsListingId: representativeListingId,
          discogsReleaseId: group.product.discogsReleaseId,
          description: group.product.description,
          status: group.product.status,
          version: sql`${schema.products.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, existingProduct.id));
    } else {
      const [createdProduct] = await d
        .insert(schema.products)
        .values({
          ...group.product,
          discogsListingId: representativeListingId,
        })
        .returning({ id: schema.products.id });
      productId = createdProduct.id;
    }

    if (!productId) {
      continue;
    }

    await d.delete(schema.productImages).where(eq(schema.productImages.productId, productId));

    if (group.imageUrls.length > 0) {
      await d.insert(schema.productImages).values(
        group.imageUrls.map((url, sortOrder) => ({
          id: crypto.randomUUID(),
          productId,
          url,
          sortOrder,
        }))
      );
      rowsWithImages += 1;
    } else {
      rowsWithoutImages += 1;
    }
  }

  const importedProducts = await d.query.products.findMany({
    where: and(isNull(schema.products.deletedAt), isNotNull(schema.products.discogsListingId)),
    columns: {
      id: true,
      artist: true,
      title: true,
      format: true,
      pressingYear: true,
      pressingLabel: true,
      pressingCatalogNumber: true,
      conditionMedia: true,
      conditionSleeve: true,
      discogsListingId: true,
    },
  });
  const staleIds = importedProducts
    .filter((product) => {
      const productKey = productIdentityFromRecord(product);
      return (
        product.discogsListingId != null &&
        !importedListingIds.includes(product.discogsListingId) &&
        !importedKeys.has(productKey)
      );
    })
    .map((product) => product.id);

  const archivedProducts =
    staleIds.length > 0
      ? await d
          .update(schema.products)
          .set({
            status: "archived",
            stockQuantity: 0,
            version: sql`${schema.products.version} + 1`,
            updatedAt: new Date(),
          })
          .where(inArray(schema.products.id, staleIds))
          .returning({ id: schema.products.id })
      : [];

  return {
    ...inspection,
    imported: groups.length,
    rowsWithImages,
    rowsWithoutImages,
    archived: archivedProducts.length,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Discogs Collection CSV (export from profile/collection)
// Columns: Catalog#, Artist, Title, Label, Format, Rating, Released,
//          release_id, CollectionFolder, Date Added,
//          Collection Media Condition, Collection Sleeve Condition,
//          Collection Notes, Collection Price Paid
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function isCollectionCsv(input: string): boolean {
  const firstLine = (input.split("\n")[0] ?? "").toLowerCase();
  return firstLine.includes("collection media condition");
}

export function inspectDiscogsCollectionCsv(input: string): DiscogsImportInspection {
  const parsed = parseCsv(input);
  return {
    headers: parsed.headers,
    requiredColumns: COLLECTION_REQUIRED_COLUMNS.map((name) => ({
      name,
      found: parsed.headers.some((h) => h.toLowerCase().trim() === name),
    })),
    totalRows: parsed.rows.length,
    activeRows: parsed.rows.length,
  };
}

function descriptionForCollection(row: CollectionRow, release: DiscogsRelease | null): string {
  const parts: string[] = [];

  const releaseLine = [
    firstNonEmpty(release?.labels?.[0]?.name, row.label),
    firstNonEmpty(release?.labels?.[0]?.catno, row["catalog#"]),
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
    row["collection media condition"].trim()
      ? `Media: ${row["collection media condition"].trim()}`
      : null,
    row["collection sleeve condition"].trim() &&
    row["collection sleeve condition"].trim() !== "Generic"
      ? `Sleeve: ${row["collection sleeve condition"].trim()}`
      : null,
  ].filter(Boolean);

  if (conditions.length > 0) parts.push(conditions.join(" | "));

  const notes = row["collection notes"].trim();
  if (notes) parts.push(notes);
  else if (release?.notes?.trim()) parts.push(release.notes.trim().replace(/\s+/g, " ").slice(0, 500));

  return parts.join("\n\n") || `${row.artist.trim()} - ${row.title.trim()}`;
}

export async function importDiscogsCollectionCsv(
  input: string,
  targetStatus: "active" | "archived" = "archived"
): Promise<DiscogsImportSummary> {
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
    try {
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

      const mediaCondition = toMediaCondition(row["collection media condition"]);
      const sleeveCondition = toMediaCondition(row["collection sleeve condition"]);
      const pricePaid = row["collection price paid"].trim();

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
        pressingLabel: firstNonEmpty(release?.labels?.[0]?.name, row.label),
        pressingYear:
          safeYear(release?.year) ??
          (row.released ? Number.parseInt(row.released, 10) : null),
        pressingCatalogNumber: firstNonEmpty(release?.labels?.[0]?.catno, row["catalog#"]),
        discogsListingId: null,
        discogsReleaseId: releaseId,
        description: descriptionForCollection(row, release),
        status: targetStatus,
      };

      const existing = await d.query.products.findFirst({
        where: buildProductIdentityWhere({
          artist: insertValues.artist,
          title: insertValues.title,
          format: insertValues.format,
          pressingYear: insertValues.pressingYear,
          pressingLabel: insertValues.pressingLabel,
          pressingCatalogNumber: insertValues.pressingCatalogNumber,
          conditionMedia: insertValues.conditionMedia,
          conditionSleeve: insertValues.conditionSleeve,
        }),
        columns: { id: true, stockQuantity: true, status: true, version: true },
      });

      if (existing) {
        const nextStockQuantity = existing.stockQuantity + 1;
        await d
          .update(schema.products)
          .set({
            stockQuantity: nextStockQuantity,
            status: resolveProductStatus({
              status: existing.status,
              stockQuantity: nextStockQuantity,
            }),
            updatedAt: new Date(),
            version: existing.version + 1,
          })
          .where(eq(schema.products.id, existing.id));
      } else {
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
      }

      imported += 1;
    } catch {
      // Skip this row and continue with the rest
    }
  }

  return {
    ...inspection,
    imported,
    rowsWithImages,
    rowsWithoutImages,
    archived: 0,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Streaming / generator variants (used by SSE API route for live progress)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ImportProgressEvent =
  | { type: "start"; total: number; csvType: "inventory" | "collection" }
  | { type: "progress"; processed: number; total: number; current: string }
  | { type: "complete"; summary: DiscogsImportSummary }
  | { type: "error"; message: string };

export async function* importDiscogsInventoryCsvGenerator(
  input: string,
  signal?: AbortSignal,
  targetStatus: "active" | "archived" = "active"
): AsyncGenerator<ImportProgressEvent> {
  requireEnv("DATABASE_URL");
  const discogsToken = requireEnv("DISCOGS_USER_TOKEN");
  const discogsUserAgent = process.env.DISCOGS_USER_AGENT?.trim() || DEFAULT_USER_AGENT;

  const inspection = inspectDiscogsInventoryCsv(input);
  const parsed = parseCsv(input);
  const catalogRows = (parsed.rows as unknown as InventoryRow[]).filter(
    (row) => toProductStatus(row.status) === "active"
  );

  if (inspection.requiredColumns.some((c) => !c.found)) {
    yield { type: "error", message: "The CSV is missing one or more required columns." };
    return;
  }
  if (catalogRows.length === 0) {
    yield { type: "error", message: "No 'For Sale' rows were found in the uploaded CSV." };
    return;
  }

  yield { type: "start", total: catalogRows.length, csvType: "inventory" };

  const d = db();
  const groups = await buildInventoryImportGroups({
    rows: catalogRows,
    targetStatus,
    discogsToken,
    discogsUserAgent,
  });
  const importedListingIds = groups.flatMap((group) => group.listingIds);
  const importedKeys = new Set(groups.map((group) => group.key));
  let rowsWithImages = 0;
  let rowsWithoutImages = 0;

  for (let i = 0; i < groups.length; i++) {
    if (signal?.aborted) break;

    const group = groups[i]!;
    yield {
      type: "progress",
      processed: i + 1,
      total: groups.length,
      current: `${group.product.artist} – ${group.product.title}`,
    };

    const representativeListingId = group.listingIds[0] ?? null;
    const [existingByListing, existingByIdentity] = await Promise.all([
      representativeListingId
        ? d.query.products.findFirst({
            where: and(
              eq(schema.products.discogsListingId, representativeListingId),
              isNull(schema.products.deletedAt)
            ),
            columns: { id: true, discogsListingId: true },
          })
        : Promise.resolve(null),
      d.query.products.findFirst({
        where: buildProductMatchWhere(group.product),
        columns: { id: true, discogsListingId: true },
      }),
    ]);
    const existingProduct = existingByListing ?? existingByIdentity;
    let productId = existingProduct?.id;

    if (existingProduct) {
      await d
        .update(schema.products)
        .set({
          artist: group.product.artist,
          title: group.product.title,
          format: group.product.format,
          genre: group.product.genre,
          priceCents: group.product.priceCents,
          stockQuantity: group.product.stockQuantity,
          conditionMedia: group.product.conditionMedia,
          conditionSleeve: group.product.conditionSleeve,
          pressingLabel: group.product.pressingLabel,
          pressingYear: group.product.pressingYear,
          pressingCatalogNumber: group.product.pressingCatalogNumber,
          discogsListingId: representativeListingId,
          discogsReleaseId: group.product.discogsReleaseId,
          description: group.product.description,
          status: group.product.status,
          version: sql`${schema.products.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, existingProduct.id));
    } else {
      const [createdProduct] = await d
        .insert(schema.products)
        .values({
          ...group.product,
          discogsListingId: representativeListingId,
        })
        .returning({ id: schema.products.id });
      productId = createdProduct.id;
    }

    if (!productId) continue;

    await d.delete(schema.productImages).where(eq(schema.productImages.productId, productId));
    if (group.imageUrls.length > 0) {
      await d.insert(schema.productImages).values(
        group.imageUrls.map((url, sortOrder) => ({
          id: crypto.randomUUID(),
          productId,
          url,
          sortOrder,
        }))
      );
      rowsWithImages += 1;
    } else {
      rowsWithoutImages += 1;
    }
  }

  const importedProducts = await d.query.products.findMany({
    where: and(isNull(schema.products.deletedAt), isNotNull(schema.products.discogsListingId)),
    columns: {
      id: true,
      artist: true,
      title: true,
      format: true,
      pressingYear: true,
      pressingLabel: true,
      pressingCatalogNumber: true,
      conditionMedia: true,
      conditionSleeve: true,
      discogsListingId: true,
    },
  });
  const staleIds = importedProducts
    .filter((product) => {
      const productKey = productIdentityFromRecord(product);
      return (
        product.discogsListingId != null &&
        !importedListingIds.includes(product.discogsListingId) &&
        !importedKeys.has(productKey)
      );
    })
    .map((product) => product.id);

  const archivedProducts =
    staleIds.length > 0
      ? await d
          .update(schema.products)
          .set({
            status: "archived",
            stockQuantity: 0,
            version: sql`${schema.products.version} + 1`,
            updatedAt: new Date(),
          })
          .where(inArray(schema.products.id, staleIds))
          .returning({ id: schema.products.id })
      : [];

  yield {
    type: "complete",
    summary: {
      ...inspection,
      imported: groups.length,
      rowsWithImages,
      rowsWithoutImages,
      archived: archivedProducts.length,
    },
  };
}

export async function* importDiscogsCollectionCsvGenerator(
  input: string,
  signal?: AbortSignal,
  targetStatus: "active" | "archived" = "archived"
): AsyncGenerator<ImportProgressEvent> {
  const inspection = inspectDiscogsCollectionCsv(input);

  if (inspection.requiredColumns.some((c) => !c.found)) {
    yield { type: "error", message: "The CSV is missing one or more required collection columns." };
    return;
  }

  if (inspection.totalRows === 0) {
    yield { type: "error", message: "No rows found in the collection CSV." };
    return;
  }

  requireEnv("DATABASE_URL");
  const discogsToken = requireEnv("DISCOGS_USER_TOKEN");
  const discogsUserAgent = process.env.DISCOGS_USER_AGENT?.trim() || DEFAULT_USER_AGENT;

  const parsed = parseCsv(input);
  const rows = parsed.rows as unknown as CollectionRow[];

  yield { type: "start", total: rows.length, csvType: "collection" };

  const d = db();
  const releaseCache = new Map<number, Promise<DiscogsRelease | null>>();
  let imported = 0;
  let rowsWithImages = 0;
  let rowsWithoutImages = 0;

  for (const row of rows) {
    if (signal?.aborted) break;

    try {
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

      const mediaCondition = toMediaCondition(row["collection media condition"]);
      const sleeveCondition = toMediaCondition(row["collection sleeve condition"]);
      const pricePaid = row["collection price paid"].trim();

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
        pressingLabel: firstNonEmpty(release?.labels?.[0]?.name, row.label),
        pressingYear:
          safeYear(release?.year) ??
          (row.released ? Number.parseInt(row.released, 10) : null),
        pressingCatalogNumber: firstNonEmpty(release?.labels?.[0]?.catno, row["catalog#"]),
        discogsListingId: null,
        discogsReleaseId: releaseId,
        description: descriptionForCollection(row, release),
        status: targetStatus,
      };

      const existing = await d.query.products.findFirst({
        where: buildProductIdentityWhere({
          artist: insertValues.artist,
          title: insertValues.title,
          format: insertValues.format,
          pressingYear: insertValues.pressingYear,
          pressingLabel: insertValues.pressingLabel,
          pressingCatalogNumber: insertValues.pressingCatalogNumber,
          conditionMedia: insertValues.conditionMedia,
          conditionSleeve: insertValues.conditionSleeve,
        }),
        columns: { id: true, stockQuantity: true, status: true, version: true },
      });

      if (existing) {
        const nextStockQuantity = existing.stockQuantity + 1;
        await d
          .update(schema.products)
          .set({
            stockQuantity: nextStockQuantity,
            status: resolveProductStatus({
              status: existing.status,
              stockQuantity: nextStockQuantity,
            }),
            updatedAt: new Date(),
            version: existing.version + 1,
          })
          .where(eq(schema.products.id, existing.id));
      } else {
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
      }

      imported += 1;
    } catch {
      // Skip this row and continue with the rest
    }

    yield {
      type: "progress",
      processed: imported,
      total: rows.length,
      current: `${row.artist?.trim() ?? ""} – ${row.title?.trim() ?? ""}`,
    };
  }

  yield {
    type: "complete",
    summary: {
      ...inspection,
      imported,
      rowsWithImages,
      rowsWithoutImages,
    },
  };
}

