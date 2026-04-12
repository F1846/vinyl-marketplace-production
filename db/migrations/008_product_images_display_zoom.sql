-- Migration 008: add display_zoom to product_images
--
-- display_zoom is a multiplier (0.0–1.0) that tells the UI how much of the
-- image container the image should fill.  1.0 = fill completely (current
-- behaviour), 0.96 = 4 % breathing room on every side.
--
-- Default is 1.0 (no change) so existing rows and manual uploads are
-- unaffected.  The Discogs importer sets 0.96 on every image it inserts.

ALTER TABLE "product_images"
  ADD COLUMN "display_zoom" real NOT NULL DEFAULT 1.0;
