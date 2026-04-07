-- Migration: 002_discogs_catalog_sync
-- Description: Add Discogs source identifiers for idempotent catalog imports
-- Created: 2026-04-07

ALTER TABLE "products"
  ADD COLUMN "discogs_listing_id" varchar(32),
  ADD COLUMN "discogs_release_id" integer;

ALTER TABLE "products"
  ADD CONSTRAINT "products_discogs_listing_id_unique" UNIQUE ("discogs_listing_id");

CREATE INDEX "idx_products_discogs_release_id"
  ON "products" ("discogs_release_id");
