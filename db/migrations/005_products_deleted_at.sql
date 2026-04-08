ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

UPDATE "products"
SET "status" = 'sold_out'
WHERE "deleted_at" IS NULL
  AND "status" = 'active'
  AND "stock_quantity" <= 0;
