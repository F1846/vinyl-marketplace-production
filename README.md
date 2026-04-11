# Vinyl Marketplace

Reusable Next.js storefront and admin system for a record shop selling vinyl, tapes, and CDs.

This repository is documented as a generic template so it can be reused for other shops. Brand-specific text, SEO keywords, store contact data, pickup details, and translated storefront copy should be customized before launch.

## Current Status

- Responsive storefront with homepage shelves, catalog filters, product pages, cart, checkout, order confirmation, and order tracking
- Auto-detected storefront language with manual language switcher
- Card checkout, PayPal checkout, and local pickup support
- Mandatory address step before payment
- Database-driven shipping rules
- PDF invoices for customers and admins
- Transactional customer emails via Mailgun
- Tracking support with Ship24, plus 17TRACK or AfterShip fallback
- Admin tools for products, inventory, import jobs, orders, shipping rules, and login logs
- CSV import flow for both active catalog listings and full collection inventory
- CI, preview deploy workflow, manual production deploy workflow, and daily security audit automation

## What You Should Customize First

Before using this repo for a real shop, update these branding and content surfaces:

- `src/lib/site.ts`
  - store name
  - description
  - SEO keywords
  - order/support emails
  - legal address
  - pickup defaults
- `src/lib/i18n/dictionaries.ts`
  - storefront copy in every supported language
- `public/logo-mark.svg`
  - logo mark shown in header, favicon-derived assets, and metadata
- `.env.local` / Vercel environment variables
  - domain
  - email sender
  - legal/store contact details
  - payment and tracking provider credentials

The codebase still ships with example defaults in some source files so the app runs out of the box. Treat those values as placeholders, not production-ready branding.

## Feature Summary

- Storefront
  - homepage with featured shelves and random product previews
  - catalog with search, sort, multi-genre filtering, and progressive loading
  - product pages with image gallery, release notes, grading, stock, and add-to-cart
  - cart and checkout with address validation before payment
  - order confirmation and track-order lookup
- Payments and fulfillment
  - Stripe checkout
  - PayPal checkout
  - local pickup flow
  - database-driven shipping rates by destination and cart composition
  - PDF invoice generation
  - customer emails for confirmation, shipment, status updates, and admin-sent manual messages
- Admin
  - dashboard
  - product CRUD and status management
  - inventory / collection view
  - CSV import jobs with destination selection
  - order detail tools for status, tracking, VAT, invoice download, and customer email
  - shipping rule management
  - login logs page
- Operations
  - PostgreSQL via Drizzle ORM
  - optional Vercel Blob media helpers
  - security audit automation
  - GitHub Actions CI and deploy workflows

## Tech Stack

- Framework: Next.js 15 App Router
- Runtime: React 19
- Database: PostgreSQL with Drizzle ORM
- Styling: Tailwind CSS
- Payments: Stripe Checkout and PayPal
- Email: Mailgun
- File/media storage: Vercel Blob helpers
- Tracking: Ship24, 17TRACK, or AfterShip
- Deployment: Vercel
- CI/CD: GitHub Actions

## Local Development

### Prerequisites

- Node.js 22+
- PostgreSQL database
- Stripe account
- Mailgun account
- Optional: PayPal account
- Optional: Discogs token for CSV enrichment and image lookup

### Setup

```bash
git clone <your-repo-url>
cd vinyl-marketplace-production
npm install
cp .env.example .env.local
```

Then fill in `.env.local` with your own values and run:

```bash
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See [.env.example](./.env.example) for the full template.

### Core

- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `GOOGLE_SITE_VERIFICATION`
- `TRUST_PROXY_HEADERS`

### Admin and secrets

- `ADMIN_PASSWORD`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `CHECKOUT_STATE_SECRET`
- `INVOICE_DOWNLOAD_SECRET`
- `CRON_SECRET`

### Payments

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_ENVIRONMENT`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `NEXT_PUBLIC_PAYPAL_ENABLED`

### Email

- `MAILGUN_API_KEY`
- `MAILGUN_DOMAIN`
- `MAILGUN_BASE_URL`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `EMAIL_BCC`

### Tracking

- `TRACKING_PROVIDER`
- `SHIP24_API_KEY`
- `SEVENTEENTRACK_API_KEY`
- `AFTERSHIP_API_KEY`

### Store profile

- `STORE_OWNER`
- `STORE_ORDER_EMAIL`
- `STORE_SUPPORT_EMAIL`
- `STORE_CONTACT_EMAIL`
- `STORE_SUPPORT_CONTACT_EMAIL`
- `STORE_ADDRESS_LINE1`
- `STORE_ADDRESS_LINE2`
- `STORE_POSTAL_CODE`
- `STORE_CITY`
- `STORE_COUNTRY`
- `STORE_PHONE`
- `STORE_VAT_ID`

### Pickup profile

- `STORE_PICKUP_LABEL`
- `STORE_PICKUP_NOTE`
- `STORE_PICKUP_CONTACT_NAME`
- `STORE_PICKUP_ADDRESS_LINE1`
- `STORE_PICKUP_POSTAL_CODE`
- `STORE_PICKUP_CITY`
- `STORE_PICKUP_COUNTRY`
- `STORE_PICKUP_PHONE`
- `STORE_PICKUP_PHONE_LABEL`

### Catalog and media helpers

- `DISCOGS_USER_TOKEN`
- `DISCOGS_USER_AGENT`
- `BLOB_READ_WRITE_TOKEN`

## Common Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the local Next.js dev server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run db:push` | Push schema changes to the database |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run db:seed` | Seed starter data |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run admin:hash-password -- "your-password"` | Generate an admin password hash |
| `npm run catalog:import-discogs -- "path-to-csv"` | Import a Discogs-style inventory CSV |
| `npm run shipping:apply` | Apply shipping rate seed rules |
| `npm run email:test -- you@example.com` | Send a live transactional email test |
| `npm run email:test-order-flow -- you@example.com` | Send order-flow email samples |

## Backup and Data Notes

- Runtime uses one primary PostgreSQL `DATABASE_URL`
- MongoDB is supported only as an offline backup target through `scripts/backup_postgres_to_mongo.py`
- Dual-write between PostgreSQL and MongoDB is not enabled by default
- If you need a backup database, clone PostgreSQL or run the backup script rather than changing the app to write to two databases

Example:

```bash
python scripts/backup_postgres_to_mongo.py "mongodb+srv://..."
```

Optional second argument:

```bash
python scripts/backup_postgres_to_mongo.py "mongodb+srv://..." "shop_backup"
```

## Admin Overview

- Dashboard with stock and order totals
- Product management with edit, hide, relist, archive, and removal actions
- Inventory / collection view for not-for-sale stock
- Bulk CSV import with destination selection
- Order detail page with:
  - status changes
  - tracking updates
  - VAT override
  - invoice download
  - manual customer email composer
- Shipping rules editor
- Login logs page
- Absolute session expiry and inactivity refresh logic for admin auth

## Order and Customer Flow

- Cart and checkout collect full customer details before payment
- Stripe orders are finalized after webhook confirmation
- PayPal orders use a signed return/capture flow
- Pickup orders use a separate no-shipping checkout path
- Order confirmation emails include item summaries and product thumbnails
- Shipping and status emails reuse the same branded shell
- Customers can download invoice PDFs from email links and order lookup
- Customers can track orders at `/track-order`

## Deployment Model

- `CI` runs on pushes and pull requests targeting `main`
- `Deploy Preview to Vercel` runs on push to `main` and on manual dispatch
- `Deploy Production to Vercel` is manual-only
- `vercel.json` disables direct Git-based deployments so deploys are controlled through GitHub Actions

## Security and Ops Status

- Admin and sensitive workflow pages are intentionally `noindex`
- Public storefront pages are indexable
- DB-backed rate limiting is in place for key abuse surfaces
- Admin sessions use a dedicated secret when configured
- GitHub CodeQL and audit workflows are present
- Repo security policy lives in [.github/SECURITY.md](./.github/SECURITY.md)

## Related Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DEPLOY.md](./DEPLOY.md)
- [SEO-STRATEGY.md](./SEO-STRATEGY.md)
- [docs/PRD.md](./docs/PRD.md)
