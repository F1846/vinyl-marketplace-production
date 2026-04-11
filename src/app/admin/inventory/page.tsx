import { db } from "@/db";
import { desc, isNull } from "drizzle-orm";
import { schema } from "@/db";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import { resolveProductStatus } from "@/lib/product-admin";
import type { ProductFormat, ProductStatus, MediaCondition } from "@/types/product";
import { AdminInventoryTable } from "@/components/admin/admin-inventory-table";

export const dynamic = "force-dynamic";

export type InventoryRow = {
  id: string;
  artist: string;
  title: string;
  format: ProductFormat;
  genre: string;
  priceCents: number;
  stockQuantity: number;
  status: ProductStatus;
  conditionMedia: MediaCondition | null;
  pressingLabel: string | null;
  pressingYear: number | null;
  pressingCatalogNumber: string | null;
  discogsReleaseId: number | null;
  imageUrl: string | null;
};

export default async function AdminInventoryPage() {
  await requireAuthenticatedAdmin();

  const d = db();
  const products = await d.query.products.findMany({
    where: isNull(schema.products.deletedAt),
    orderBy: [desc(schema.products.createdAt)],
    with: {
      images: {
        orderBy: [schema.productImages.sortOrder],
        limit: 1,
      },
    },
  });

  const rows: InventoryRow[] = products.map((product) => ({
    id: product.id,
    artist: product.artist,
    title: product.title,
    format: product.format,
    genre: product.genre,
    priceCents: product.priceCents,
    stockQuantity: product.stockQuantity,
    status: resolveProductStatus(product) as ProductStatus,
    conditionMedia: product.conditionMedia,
    pressingLabel: product.pressingLabel,
    pressingYear: product.pressingYear,
    pressingCatalogNumber: product.pressingCatalogNumber,
    discogsReleaseId: product.discogsReleaseId,
    imageUrl: product.images[0]?.url ?? null,
  }));

  return <AdminInventoryTable items={rows} />;
}
