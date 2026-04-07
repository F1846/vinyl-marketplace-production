import { db } from "@/db";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const d = db();
  const product = await d.query.products.findFirst({
    where: eq(schema.products.id, id),
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });

  if (!product) notFound();

  async function handleSubmit(formData: FormData) {
    "use server";

    const priceCents = Number(formData.get("priceCents"));
    const stockQuantity = Number(formData.get("stockQuantity"));
    const pressingYear = formData.get("pressingYear") ? Number(formData.get("pressingYear")) : null;

    await d
      .update(schema.products)
      .set({
        artist: formData.get("artist") as string,
        title: formData.get("title") as string,
        format: formData.get("format") as "vinyl" | "cassette" | "cd",
        genre: formData.get("genre") as string,
        priceCents,
        stockQuantity,
        conditionMedia: (formData.get("conditionMedia") as string) || null,
        conditionSleeve: formData.get("format") === "vinyl" ? ((formData.get("conditionSleeve") as string) || null) : null,
        pressingLabel: (formData.get("pressingLabel") as string) || null,
        pressingYear,
        pressingCatalogNumber: (formData.get("pressingCatalogNumber") as string) || null,
        description: formData.get("description") as string,
        version: product.version + 1,
      })
      .where(eq(schema.products.id, id));

    redirect("/admin/products");
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          Edit: <span className="text-accent">{product.artist} — {product.title}</span>
        </h1>
        <Link href="/admin/products" className="text-sm text-accent hover:underline">
          Back to Products
        </Link>
      </div>

      <form action={handleSubmit} className="card space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="artist" className="label">Artist</label>
            <input id="artist" name="artist" className="input" defaultValue={product.artist} required />
          </div>
          <div>
            <label htmlFor="title" className="label">Title</label>
            <input id="title" name="title" className="input" defaultValue={product.title} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="format" className="label">Format</label>
            <select id="format" name="format" className="input" defaultValue={product.format} required>
              <option value="vinyl">Vinyl</option>
              <option value="cassette">Cassette</option>
              <option value="cd">CD</option>
            </select>
          </div>
          <div>
            <label htmlFor="genre" className="label">Genre</label>
            <input id="genre" name="genre" className="input" defaultValue={product.genre} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="priceCents" className="label">Price (cents)</label>
            <input id="priceCents" name="priceCents" type="number" className="input" defaultValue={product.priceCents} required />
          </div>
          <div>
            <label htmlFor="stockQuantity" className="label">Stock</label>
            <input id="stockQuantity" name="stockQuantity" type="number" className="input" defaultValue={product.stockQuantity} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="conditionMedia" className="label">Media Condition</label>
            <select id="conditionMedia" name="conditionMedia" className="input" defaultValue={product.conditionMedia ?? ""}>
              <option value="">Not graded</option>
              {["M", "NM", "VG+", "VG", "G", "P"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="conditionSleeve" className="label">Sleeve Condition</label>
            <select id="conditionSleeve" name="conditionSleeve" className="input" defaultValue={product.conditionSleeve ?? ""}>
              <option value="">Not graded</option>
              {["M", "NM", "VG+", "VG", "G", "P"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="pressingLabel" className="label">Label</label>
            <input id="pressingLabel" name="pressingLabel" className="input" defaultValue={product.pressingLabel ?? ""} />
          </div>
          <div>
            <label htmlFor="pressingYear" className="label">Year</label>
            <input id="pressingYear" name="pressingYear" type="number" className="input" defaultValue={product.pressingYear ?? ""} />
          </div>
          <div>
            <label htmlFor="pressingCatalogNumber" className="label">Catalog #</label>
            <input id="pressingCatalogNumber" name="pressingCatalogNumber" className="input" defaultValue={product.pressingCatalogNumber ?? ""} />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="label">Description</label>
          <textarea id="description" name="description" className="input" rows={4} defaultValue={product.description} required />
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Link href="/admin/products" className="btn-secondary">Cancel</Link>
          <button type="submit" className="btn-primary">Update Product</button>
        </div>
      </form>
    </div>
  );
}
