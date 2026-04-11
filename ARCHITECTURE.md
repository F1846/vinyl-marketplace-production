# Vinyl Marketplace Architecture

## Overview

This application is a full-stack record-shop platform built with Next.js App Router. It combines a public storefront, a protected admin area, checkout and payment flows, transactional email, invoice generation, order tracking, shipping rules, and database-backed product and inventory management.

The repository is reusable, but it ships with example branding defaults. Replace store identity, translations, SEO profile, and legal/contact details before launch.

## High-Level System

- Frontend
  - public storefront pages under `src/app/`
  - admin UI under `src/app/admin/`
  - reusable UI components under `src/components/`
- Backend
  - route handlers under `src/app/api/`
  - server actions under `src/actions/`
  - domain services under `src/lib/`
- Persistence
  - PostgreSQL via Drizzle ORM
  - schema and migrations under `db/`
- Integrations
  - Stripe
  - PayPal
  - Mailgun
  - Ship24 / 17TRACK / AfterShip
  - optional Vercel Blob helpers
- Operations
  - GitHub Actions CI
  - preview deploy workflow
  - manual production deploy workflow
  - daily security audit workflows

## Repository Layout

```text
.
|-- .github/
|   |-- SECURITY.md
|   |-- codex/
|   `-- workflows/
|-- db/
|   |-- index.ts
|   |-- schema.ts
|   `-- migrations/
|-- docs/
|   `-- PRD.md
|-- public/
|-- scripts/
|-- src/
|   |-- actions/
|   |-- app/
|   |-- components/
|   |-- hooks/
|   |-- lib/
|   |-- styles/
|   |-- types/
|   `-- validations/
|-- ARCHITECTURE.md
|-- DEPLOY.md
|-- README.md
`-- SEO-STRATEGY.md
```

## Main Application Surfaces

### Public storefront

Key routes:

- `/`
- `/catalog`
- `/products/[id]`
- `/cart`
- `/checkout/paypal`
- `/order-confirmation`
- `/track-order`
- `/about`
- `/contact`
- `/shipping`
- `/refund`
- `/privacy`
- `/terms`
- `/imprint`
- `/[slug]`

The storefront is mostly server-rendered, with client components where session cart state, catalog interactivity, checkout return flows, and live customer interactions are needed.

### Admin area

Key routes:

- `/admin`
- `/admin/login`
- `/admin/products`
- `/admin/inventory`
- `/admin/import`
- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/shipping`
- `/admin/logs`

The admin UI uses a mix of server components, server actions, and route handlers. Authentication is enforced at the route level and session refresh keeps active admin sessions alive until expiry.

### API surface

Key route handlers:

- `/api/admin/login`
- `/api/admin/logout`
- `/api/admin/session/refresh`
- `/api/admin/import`
- `/api/admin/import/[jobId]`
- `/api/admin/logs`
- `/api/admin/orders/[id]/invoice`
- `/api/cart/refresh`
- `/api/catalog`
- `/api/checkout/create`
- `/api/checkout/paypal/create`
- `/api/checkout/paypal/capture`
- `/api/checkout/pickup`
- `/api/health`
- `/api/orders/invoice`
- `/api/orders/lookup`
- `/api/shipping/countries`
- `/api/shipping/quote`
- `/api/tracking/sync`
- `/api/webhooks/stripe`

## Core Data Model

### Primary tables

Current core tables include:

- `products`
- `product_images`
- `orders`
- `order_items`
- `shipping_rates`
- `rate_limits`
- `admin_login_logs`
- `import_jobs`

### Product and inventory model

The app does not split catalog and inventory into separate applications or separate databases.

- `products` stores both:
  - active storefront listings
  - not-for-sale inventory / collection stock
- storefront visibility is derived from status, stock, and admin actions
- admin import flows can route CSV rows directly into:
  - on-sale catalog stock
  - off-sale inventory stock
- import helpers try to match existing items so repeated imports update the existing release instead of blindly multiplying rows

### Order model

Orders are normalized across:

- `orders`
  - customer identity
  - address data
  - totals
  - payment method
  - order status
  - tracking state
- `order_items`
  - purchased product reference
  - quantity
  - price snapshot at purchase time

## Core Service Modules

### `src/lib/`

Important modules:

- `auth.ts`
  - admin auth, session signing, expiry, and refresh behavior
- `cart.ts`
  - cart state helpers and refresh logic
- `catalog.ts`
  - storefront catalog querying and filtering
- `checkout.ts`
  - checkout validation, shipping calculation, order finalization
- `checkout-state.ts`
  - signed PayPal return state
- `email.ts`
  - Mailgun integration and shared customer email shell
- `image-upload.ts`
  - product image helper logic
- `import-jobs.ts`
  - CSV import orchestration
- `invoice.ts`
  - PDF invoice generation and signed download links
- `order-notifications.ts`
  - order email orchestration
- `order-tracking.ts`
  - tracking provider sync and normalization
- `paypal.ts`
  - PayPal configuration helpers
- `product-admin.ts`
  - admin product and inventory mutations
- `rate-limit.ts`
  - DB-backed rate limiting for public abuse-sensitive surfaces
- `shipping.ts`
  - shipping rule calculation logic
- `site.ts`
  - store profile, SEO defaults, links, pickup and legal data
- `seo-landing-pages.ts`
  - landing page metadata source
- `discogs-import.ts`
  - CSV parsing and Discogs enrichment helpers

### `src/actions/`

Server actions handle admin-side mutations such as:

- auth actions
- cart updates
- import job creation
- order status and tracking changes
- manual customer emails
- product and inventory edits
- shipping rule edits

## Main Flows

### Catalog browsing

1. Public routes query products from PostgreSQL through Drizzle.
2. Product images are resolved and ordered for cards and product pages.
3. Metadata and JSON-LD are rendered server-side.
4. Client components handle filters, search, progressive loading, and cart interactions.

### Checkout and order creation

1. Cart items are revalidated against current stock.
2. Shipping is calculated from DB-managed rules.
3. The payment flow branches to:
   - Stripe checkout session
   - PayPal create/capture
   - local pickup checkout
4. On successful finalization:
   - stock is decremented atomically
   - order and order items are inserted
   - confirmation email is sent
   - invoice generation becomes available

### Order communication

The email system supports:

- order confirmation
- shipped notification
- status updates
- manual admin replies from the order detail page

Mail content is composed centrally so layout, subject style, and branding remain consistent across the whole order lifecycle.

### Tracking flow

1. Admin saves a tracking number and optionally a carrier slug or URL template.
2. The app syncs tracking data through the configured provider when available.
3. Admin can still override status manually when needed.
4. Customers can review the current status from `/track-order`.

### Inventory and CSV imports

1. Admin uploads a CSV through `/admin/import`.
2. The UI chooses a destination:
   - catalog / on sale
   - inventory / not for sale
3. The app creates an import job in the database.
4. Parsed rows are matched against existing records where possible.
5. Matching rows update existing stock instead of forcing duplicate entries.

### SEO surface

SEO is handled as part of the app shell, not bolted on externally.

- metadata is generated for home, catalog, product, landing, and legal pages
- sitemap and robots are generated from app routes
- JSON-LD is rendered server-side for public pages
- icon routes, manifest, and social images are provided under `src/app/`

## Branding and Localization Surfaces

Brand-specific behavior is intentionally concentrated in a few places:

- `src/lib/site.ts`
  - store name, legal contact, pickup defaults, SEO profile, canonical base URL
- `src/lib/i18n/dictionaries.ts`
  - translated storefront and informational copy
- `public/`
  - logo and other static visual assets
- environment variables
  - sender domains, support mailboxes, legal address, pickup data, payment keys, tracking keys

If you reuse this repository for another shop, update these first.

## Security and Operational Guardrails

- admin auth with signed sessions
- expiry plus refresh behavior for active admin sessions
- DB-backed rate limiting
- Stripe webhook signature verification
- signed PayPal state handling
- invoice download token protection
- protected admin routes
- public/private indexing boundaries
- GitHub CodeQL and audit workflows

## Workflow Model

- `CI`
  - audit, lint, typecheck, focused tests, and build
- `Deploy Preview to Vercel`
  - runs for pull requests and push to `main`
- `Deploy Production to Vercel`
  - manual only
- `Daily Security Audit`
  - scheduled audit workflow

Preview environments are automatic for review, while production promotion stays explicit.
