-- ──────────────────────────────────────────────
-- Migration: 001_initial
-- Description: Create enums, core tables, indexes
-- Created: 2026-04-07
-- ──────────────────────────────────────────────

-- ── Enums ──────────────────────────────────────

CREATE TYPE "product_format" AS ENUM ('vinyl', 'cassette', 'cd');
CREATE TYPE "product_status" AS ENUM ('active', 'sold_out', 'archived');
CREATE TYPE "media_condition" AS ENUM ('M', 'NM', 'VG+', 'VG', 'G', 'P');
CREATE TYPE "order_status" AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

-- ── products ───────────────────────────────────

CREATE TABLE "products" (
  "id" uuid PRIMARY KEY,
  "artist" varchar(255) NOT NULL,
  "title" varchar(255) NOT NULL,
  "format" "product_format" NOT NULL,
  "genre" varchar(100) NOT NULL,
  "price_cents" integer NOT NULL CHECK ("price_cents" >= 0),
  "stock_quantity" integer NOT NULL DEFAULT 0 CHECK ("stock_quantity" >= 0),
  "condition_media" "media_condition",
  "condition_sleeve" "media_condition",
  "pressing_label" varchar(255),
  "pressing_year" integer CHECK ("pressing_year" > 1000 AND "pressing_year" <= EXTRACT(YEAR FROM NOW()) + 2),
  "pressing_catalog_number" varchar(100),
  "description" text NOT NULL,
  "status" "product_status" NOT NULL DEFAULT 'active',
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

COMMENT ON COLUMN "products"."condition_media" IS 'Goldmine Standard grade for the record itself. Populated for vinyl, NULL for cassette/CD.';
COMMENT ON COLUMN "products"."condition_sleeve" IS 'Goldmine Standard grade for the sleeve. Nullable; NULL for non-vinyl formats.';
COMMENT ON COLUMN "products"."version" IS 'Optimistic concurrency counter. Incremented on every update. Used to detect concurrent admin edits.';

-- ── product_images ─────────────────────────────

CREATE TABLE "product_images" (
  "id" uuid PRIMARY KEY,
  "product_id" uuid NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE,
  "url" varchar(2048) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- ── orders ─────────────────────────────────────

CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY,
  "order_number" varchar(24) NOT NULL UNIQUE,
  "customer_email" varchar(255) NOT NULL,
  "customer_name" varchar(255) NOT NULL,
  "shipping_address" jsonb NOT NULL,
  "subtotal_cents" integer NOT NULL CHECK ("subtotal_cents" >= 0),
  "shipping_cents" integer NOT NULL CHECK ("shipping_cents" >= 0),
  "tax_cents" integer NOT NULL DEFAULT 0 CHECK ("tax_cents" >= 0),
  "total_cents" integer NOT NULL CHECK ("total_cents" >= 0),
  "status" "order_status" NOT NULL DEFAULT 'pending',
  "tracking_number" varchar(100),
  "tracking_carrier" varchar(100),
  "stripe_session_id" varchar(255) UNIQUE,
  "stripe_payment_intent_id" varchar(255) UNIQUE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ── order_items ────────────────────────────────

CREATE TABLE "order_items" (
  "id" uuid PRIMARY KEY,
  "order_id" uuid NOT NULL REFERENCES "orders" ("id") ON DELETE RESTRICT,
  "product_id" uuid NOT NULL REFERENCES "products" ("id") ON DELETE RESTRICT,
  "quantity" integer NOT NULL CHECK ("quantity" > 0),
  "price_at_purchase_cents" integer NOT NULL CHECK ("price_at_purchase_cents" >= 0),
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────

-- Catalog filtering: format + genre is the most common filter combo.
CREATE INDEX "idx_products_format_genre" ON "products" ("format", "genre");

-- Catalog ordering: show active products sorted by newest first.
-- Includes status so the planner can filter and sort in one pass.
CREATE INDEX "idx_products_status_created_at" ON "products" ("status", "created_at" DESC);

-- Webhook idempotency: look up orders by Stripe session ID.
CREATE INDEX "idx_orders_stripe_session_id" ON "orders" ("stripe_session_id");

-- Order tracking: customers look up by email + order number.
CREATE INDEX "idx_orders_email_number" ON "orders" ("customer_email", "order_number");

-- Order detail: fetch line items for a given order.
CREATE INDEX "idx_order_items_order_id" ON "order_items" ("order_id");

-- Product images sorted for gallery rendering.
CREATE INDEX "idx_product_images_product_sort_order" ON "product_images" ("product_id", "sort_order");

-- Admin order list: filter by status, sorted newest first.
CREATE INDEX "idx_orders_status_created_at" ON "orders" ("status", "created_at" DESC);

-- ── Audit trigger: auto-update updated_at ──────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "products_updated_at"
  BEFORE UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "orders_updated_at"
  BEFORE UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Stock decrement function: optimistic concurrency ──
-- This ensures that stock is never decremented below zero under concurrent writes.
-- It returns the number of rows affected (0 or 1). Callers MUST verify that exactly
-- one row was updated; 0 means another concurrent request exhausted the stock.

CREATE OR REPLACE FUNCTION try_reserve_stock(
  product_id_param uuid,
  quantity_param integer
)
RETURNS integer AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE "products"
  SET
    "stock_quantity" = "stock_quantity" - quantity_param,
    "version" = "version" + 1
  WHERE
    "id" = product_id_param
    AND "stock_quantity" >= quantity_param
    AND "status" IN ('active', 'sold_out'); -- sold_out can have remaining stock temporarily; archived cannot

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;
