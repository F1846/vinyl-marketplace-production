"use client";

import { useActionState } from "react";
import { addProductFormAction } from "@/actions/products";
import Link from "next/link";

export default function NewProductPage() {
  const [state, formAction] = useActionState(addProductFormAction, {
    error: null,
    success: false,
  });

  if (state.success) {
    return (
      <div className="card text-center py-12">
        <p className="text-lg text-success mb-4">Product created successfully!</p>
        <Link href="/admin/products/new" className="btn-primary">
          Add Another Product
        </Link>
        {" "}
        <Link href="/admin/products" className="btn-secondary">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Add Product</h1>
        <Link href="/admin/products" className="text-sm text-accent hover:underline">
          Back to Products
        </Link>
      </div>

      <form action={formAction} className="card space-y-6">
        {state.error && (
          <div className="rounded-md bg-red-900/20 border border-red-900/50 p-3 text-sm text-danger">
            {state.error}
          </div>
        )}

        {/* Artist + Title */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="artist" className="label">Artist</label>
            <input id="artist" name="artist" className="input" placeholder="Artist or project name" required />
          </div>
          <div>
            <label htmlFor="title" className="label">Title</label>
            <input id="title" name="title" className="input" placeholder="Album / release title" required />
          </div>
        </div>

        {/* Format + Genre */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="format" className="label">Format</label>
            <select id="format" name="format" className="input" required>
              <option value="">Select format</option>
              <option value="vinyl">Vinyl</option>
              <option value="cassette">Cassette</option>
              <option value="cd">CD</option>
            </select>
          </div>
          <div>
            <label htmlFor="genre" className="label">Genre</label>
            <input id="genre" name="genre" className="input" placeholder="e.g., Techno, House, Ambient" required />
          </div>
        </div>

        {/* Price + Stock */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="priceCents" className="label">Price (euro cents)</label>
            <input id="priceCents" name="priceCents" type="number" className="input" placeholder="2500" required />
            <p className="mt-1 text-xs text-muted">2500 = 25,00 €</p>
          </div>
          <div>
            <label htmlFor="stockQuantity" className="label">Stock</label>
            <input id="stockQuantity" name="stockQuantity" type="number" className="input" placeholder="1" required />
          </div>
        </div>

        {/* Condition */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="conditionMedia" className="label">Media Condition</label>
            <select id="conditionMedia" name="conditionMedia" className="input">
              <option value="">Select condition</option>
              {["M", "NM", "VG+", "VG", "G", "P"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="conditionSleeve" className="label">Sleeve Condition</label>
            <select id="conditionSleeve" name="conditionSleeve" className="input">
              <option value="">Select condition</option>
              {["M", "NM", "VG+", "VG", "G", "P"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pressing Info */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="pressingLabel" className="label">Label</label>
            <input id="pressingLabel" name="pressingLabel" className="input" placeholder="e.g., Warp Records" />
          </div>
          <div>
            <label htmlFor="pressingYear" className="label">Year</label>
            <input id="pressingYear" name="pressingYear" type="number" className="input" placeholder="1995" />
          </div>
          <div>
            <label htmlFor="pressingCat" className="label">Catalog #</label>
            <input id="pressingCat" name="pressingCatalogNumber" className="input" placeholder="WARPLP42" />
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="label">Description</label>
          <textarea id="description" name="description" className="input" rows={4} placeholder="Tracklist, notes, details..." required />
        </div>

        {/* Image URLs */}
        <div>
          <label htmlFor="imageUrls" className="label">Image URLs (one per line)</label>
          <textarea id="imageUrls" name="imageUrls" className="input" rows={3} placeholder={"https://example.com/cover.jpg\nhttps://example.com/back.jpg"} />
          <p className="mt-1 text-xs text-muted">Public image URLs, one per line. Max 10.</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Link href="/admin/products" className="btn-secondary">Cancel</Link>
          <button type="submit" className="btn-primary">Save Product</button>
        </div>
      </form>
    </div>
  );
}
