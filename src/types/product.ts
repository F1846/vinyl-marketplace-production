// ─── Enums ─────────────────────────────────────────

export type ProductFormat = "vinyl" | "cassette" | "cd";
export type ProductStatus = "active" | "sold_out" | "archived";
export type MediaCondition = "M" | "NM" | "VG+" | "VG" | "G" | "P";

// ─── Product ──────────────────────────────────────

export interface Product {
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
  description: string;
  status: ProductStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Product Image ────────────────────────────────

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  sortOrder: number;
  createdAt: Date;
}

// ─── Product with images (common read shape) ──────

export interface ProductWithImages extends Product {
  images: ProductImage[];
}

// ─── Condition display helpers ────────────────────

const CONDITION_LABELS: Record<MediaCondition, string> = {
  M: "Mint",
  NM: "Near Mint",
  "VG+": "Very Good Plus",
  VG: "Very Good",
  G: "Good",
  P: "Poor",
};

const SORT_ORDER: Record<MediaCondition, number> = {
  M: 0,
  NM: 1,
  "VG+": 2,
  VG: 3,
  G: 4,
  P: 5,
};

export function conditionLabel(grade: MediaCondition): string {
  return CONDITION_LABELS[grade];
}

export function conditionSortKey(grade: MediaCondition): number {
  return SORT_ORDER[grade];
}

// ─── Product input (admin form shape) ─────────────

export interface ProductInput {
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
  description: string;
  imageUrls: string[];
}
