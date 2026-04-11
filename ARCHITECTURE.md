# Vinyl Marketplace Architecture

## Overview

This application is a full-stack record-shop platform built with Next.js App Router. It combines a public storefront, a protected admin area, transactional email, payment integrations, shipping logic, order tracking, and database-backed inventory management.

The project is reusable, but it currently ships with example branding defaults. Store-specific branding should be replaced in `src/lib/site.ts`, `src/lib/i18n/dictionaries.ts`, and the environment configuration before launch.

## High-Level System

- Frontend
  - public storefront pages under `src/app/`
  - admin UI under `src/app/admin/`
  - reusable components under `src/components/`
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
├── .github/
│   ├── SECURITY.md
│   ├── codex/
│   └── workflows/
├── db/
│   ├── index.ts
│   ├── schema.ts
│   └── migrations/
├── docs/
│   └── PRD.md
├── public/
├── scripts/
├── src/
│   ├── actions/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── styles/
│   ├── types/
│   └── validations/
├── ARCHITECTURE.md
├── DEPLOY.md
├── README.md
└── SEO-STRATEGY.md
```

## Main Application Areas

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

The storefront is mostly server-rendered, with focused client components for cart state, filters, checkout interactivity, and dynamic UI.

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

The admin area is protected by route-level auth checks and uses a mix of server components and server actions for mutations.

### API routes

Key route handlers:

- `/api/admin/login`
- `/api/admin/logout`
- `/api/admin/session/refresh`
- `/api/admin/import`
- `/api/admin/import/[jobId]`
- `/api/admin/orders/[id]/invoice`
- `/api/cart/refresh`
- `/api/catalog`
- `/api/checkout/create`
- `/api/checkout/paypal/create`
- `/api/checkout/paypal/capture`
- `/api/checkout/pickup`
- `/api/orders/lookup`
- `/api/orders/invoice`
- `/api/tracking/sync`
- `/api/webhooks/stripe`

## Core Service Modules

### `db/`

- `db/schema.ts`
  - Drizzle enums, tables, and relations
- `db/index.ts`
  - shared DB client

Current main tables:

- `products`
- `product_images`
- `orders`
- `order_items`
- `shipping_rates`
- `rate_limits`
- `admin_login_logs`
- `import_jobs`

### `src/lib/`

Important modules:

- `auth.ts`
  - admin session handling
- `checkout.ts`
  - checkout validation, shipping calculation, order finalization
- `checkout-state.ts`
  - signed PayPal return state
- `email.ts`
  - Mailgun integration and customer email templates
- `invoice.ts`
  - PDF invoice generation and download tokens
- `order-notifications.ts`
  - order email orchestration
- `order-tracking.ts`
  - tracking provider sync and normalization
- `shipping.ts`
  - shipping rate calculation logic
- `site.ts`
  - store profile, SEO defaults, links, pickup and legal data
- `discogs-import.ts`
  - CSV import parsing and enrichment helpers

### `src/actions/`

Server actions handle admin mutations such as:

- product updates
- inventory edits
- order status changes
- tracking updates
- manual customer emails
- import job triggers

### `src/validations/`

Zod schemas define input boundaries for:

- checkout payloads
- order actions
- product forms

## Main Data Flows

### Catalog and storefront browsing

1. Public pages fetch products from PostgreSQL through Drizzle.
2. Product images are joined or queried in sorted order.
3. Metadata and JSON-LD are rendered server-side for SEO.
4. Client-side enhancements handle cart state and catalog interactivity.

### Checkout and order creation

1. Cart items are validated against current stock.
2. Shipping is calculated from DB-managed rules.
3. The payment flow branches to:
   - Stripe checkout session
   - PayPal create/capture
   - pickup checkout
4. On successful finalization:
   - stock is reserved atomically
   - order and order items are inserted
   - confirmation email is sent
   - invoice download becomes available

### Order email flow

The email system supports:

- order confirmation
- shipped notification
- status updates
- manual admin-sent messages

Mail content is built centrally in `src/lib/email.ts` so the layout, subject style, and shared footer stay consistent.

### Tracking flow

1. Admin saves a tracking number or tracking URL/carrier.
2. The app optionally syncs tracking data through the configured provider.
3. Status can update manually in admin or automatically from tracking sync.
4. Customers can also check live order progress via `/track-order`.

### Inventory and import flow

1. Admin uploads a CSV through `/admin/import`.
2. An import job is created and tracked in the DB.
3. Rows are parsed into products with destination-aware status:
   - active catalog
   - archived inventory / collection
4. Matching logic and import helpers decide whether to create or update entries.

## Branding and Localization Surfaces

Brand-specific behavior is spread across a few deliberate locations:

- `src/lib/site.ts`
  - store name, legal contact, pickup defaults, SEO keywords, canonical base URL
- `src/lib/i18n/dictionaries.ts`
  - translated copy for storefront and informational pages
- `public/`
  - logo and static visual assets
- environment variables
  - sender domains, contact mailboxes, legal address, pickup info

If you reuse this repository for another shop, these are the first files to update.

## Security and Operational Guardrails

- admin auth with signed sessions
- DB-backed rate limiting
- Stripe webhook signature verification
- signed PayPal state handling
- invoice download tokens
- protected admin routes
- public/private indexing boundaries
- GitHub CodeQL and audit workflows

## Current Workflow Model

- `CI`
  - lint, typecheck, focused tests, build
- `Deploy Preview to Vercel`
  - runs on push to `main`
- `Deploy Production to Vercel`
  - manual only
- `Daily Security Audit`
  - scheduled issue-based audit

This means preview deployments are automatic, while production promotion stays explicit.
