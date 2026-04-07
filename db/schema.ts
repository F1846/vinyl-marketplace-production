import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  pgEnum,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export const productFormatEnum = pgEnum("product_format", ["vinyl", "cassette", "cd"]);

export const productStatusEnum = pgEnum("product_status", ["active", "sold_out", "archived"]);

export const mediaConditionEnum = pgEnum("media_condition", ["M", "NM", "VG+", "VG", "G", "P"]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

// ──────────────────────────────────────────────
// Products
// ──────────────────────────────────────────────

export const products = pgTable("products", {
  id: uuid("id").primaryKey(),
  artist: varchar("artist", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  format: productFormatEnum("format").notNull(),
  genre: varchar("genre", { length: 100 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  conditionMedia: mediaConditionEnum("condition_media"),
  conditionSleeve: mediaConditionEnum("condition_sleeve"),
  pressingLabel: varchar("pressing_label", { length: 255 }),
  pressingYear: integer("pressing_year"),
  pressingCatalogNumber: varchar("pressing_catalog_number", { length: 100 }),
  discogsListingId: varchar("discogs_listing_id", { length: 32 }).unique(),
  discogsReleaseId: integer("discogs_release_id"),
  description: text("description").notNull(),
  status: productStatusEnum("status").notNull().default("active"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const productsRelations = relations(products, ({ many }) => ({
  images: many(productImages),
  orderItems: many(orderItems),
}));

// ──────────────────────────────────────────────
// Product Images
// ──────────────────────────────────────────────

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 2048 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

// ──────────────────────────────────────────────
// Orders
// ──────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 24 }).notNull().unique(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  shippingAddress: jsonb("shipping_address").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull(),
  taxCents: integer("tax_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  trackingCarrier: varchar("tracking_carrier", { length: 100 }),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).unique(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }).unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

// ──────────────────────────────────────────────
// Order Items
// ──────────────────────────────────────────────

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "restrict" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  priceAtPurchaseCents: integer("price_at_purchase_cents").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
