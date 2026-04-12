-- Migration 008: add display_zoom to product_images
--
-- display_zoom is a multiplier (0.0–1.0) that tells the UI how much of the
-- image container the image should fill.  1.0 = fill completely (current
-- behaviour), 0.96 = 4 % breathing room on every side (2 % on each edge).
--
-- Default is 1.0 (no change) so manual uploads are unaffected.
-- The Discogs importer sets 0.96 on every new image it inserts.
--
-- The UPDATE backfills existing rows: any URL from i.discogs.com is a
-- Discogs-sourced image and gets the same 0.96 zoom applied retroactively.

ALTER TABLE "product_images"
  ADD COLUMN "display_zoom" real NOT NULL DEFAULT 1.0;

UPDATE "product_images"
  SET "display_zoom" = 0.96
  WHERE "url" LIKE 'https://i.discogs.com/%';
