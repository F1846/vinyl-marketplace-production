# Vinyl Marketplace

Reusable Next.js storefront and admin platform for a single record shop selling vinyl, cassettes, and CDs.

This repository is intentionally documented as a generic template. Replace the shipped branding, store profile, SEO metadata, contact details, and translated copy before using it for a real shop.

## What Ships In This Repo

- Public storefront with a homepage, catalog, product pages, cart, checkout, legal pages, and order tracking
- Multilingual storefront with locale detection and manual language switching
- Address-first checkout with Stripe, PayPal, and local pickup flows
- PDF invoice generation for customers and admins
- Transactional customer emails for confirmations, status updates, shipped orders, and manual admin replies
- Live tracking support through Ship24, 17TRACK, or AfterShip
- Admin tools for products, inventory, imports, orders, shipping rules, and login logs
- CSV import flows that can send rows either straight to the catalog or into off-sale inventory
- Technical SEO foundations including sitemap, robots, metadata, JSON-LD, Open Graph assets, and favicon routes
- GitHub Actions for CI, preview deploys, production deploys, and security audit automation

## Current Feature Snapshot

### Storefront

- Homepage shelves and random record highlights
- Catalog with:
  - search
  - sort
  - format filters
  - multi-genre filtering
  - progressive loading
- Product pages with:
  - image gallery
  - label, cat number, and year
  - grading details
  - release notes
  - stock state
- Cart refresh against current stock before checkout
- Order lookup and live tracking page for customers

### Checkout and fulfillment

- Required customer address step before payment
- Stripe checkout flow
- PayPal create/capture flow
- Local pickup checkout path
- Database-driven shipping rules by destination and cart composition
- Confirmation, shipment, status, and manual admin email flows
- PDF invoice download links for customer and admin use

### Admin

- Dashboard with stock and order totals
- Product management with edit, hide, relist, archive, and removal actions
- Inventory view for not-for-sale collection stock
- Bulk selection and status actions in inventory and product lists
- CSV import jobs with destination selection:
  - catalog / on sale
  - inventory / not for sale
- Order detail tools for:
  - status updates
  - tracking updates
  - VAT override
  - invoice download
  - customer email sending
- Shipping rules editor
- Admin login logs

### Ops and SEO

- Health route for uptime checks
- Public indexable storefront pages
- `noindex` handling for admin and other sensitive surfaces
- Product, catalog, breadcrumb, website, and organization structured data
- Search Console verification support
- Preview deploy workflow for pull requests
- Manual production deploy workflow
- Daily security audit workflow

## What To Customize First

Before launch, replace the template defaults in these places first:

- `src/lib/site.ts`
  - store name
  - description
  - tagline
  - legal and pickup details
  - contact emails
  - brand aliases and SEO keywords
- `src/lib/i18n/dictionaries.ts`
  - storefront copy in each supported language
- `public/logo-mark.svg`
  - logo mark used by the header, metadata, and generated icons
- `.env.local` / Vercel environment variables
  - real domain
  - sender addresses
  - payment keys
  - tracking keys
  - store contact profile

The app is meant to run out of the box, so some example values still exist in source files. Treat them as placeholders, not production-ready store identity.

## Core Product Model

- PostgreSQL is the primary application database
- The same product model powers both:
  - live catalog listings
  - off-sale inventory / collection stock
- Product visibility is controlled through stock, status, and admin actions rather than separate storefront and inventory apps
- MongoDB support in this repo is backup-only through `scripts/backup_postgres_to_mongo.py`; the runtime stays single-database by default

## Tech Stack

- Framework: Next.js 15 App Router
- Runtime: React 19
- Database: PostgreSQL with Drizzle ORM
- Styling: Tailwind CSS
- Payments: Stripe Checkout and PayPal
- Email: Mailgun
- Tracking: Ship24, 17TRACK, or AfterShip
- Storage helpers: Vercel Blob
- Deployment: Vercel
- CI/CD: GitHub Actions

## Local Development

### Prerequisites

- Node.js 22+
- PostgreSQL database
- Stripe account
- Mailgun account
- Optional: PayPal account
- Optional: Ship24, 17TRACK, or AfterShip account
- Optional: Discogs token for CSV enrichment and image lookup helpers

### Setup

```bash
git clone <your-repo-url>
cd vinyl-marketplace-production
npm install
cp .env.example .env.local
```

Fill in `.env.local`, then run:

```bash
npm run db:push
npm run db:seed
npm run shipping:apply
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Use [.env.example](./.env.example) as the source of truth.

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

### Catalog import and media helpers

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
| `npm run catalog:import-discogs -- "path-to-csv"` | Import a Discogs-style CSV into the product model |
| `npm run shipping:apply` | Seed or refresh shipping rules |
| `npm run email:test -- you@example.com` | Send a transactional email test |
| `npm run email:test-order-flow -- you@example.com` | Send example order-flow emails |

## CI and Deployment Model

- `CI`
  - runs on push to `main`
  - runs on pull requests targeting `main`
  - includes audit, lint, typecheck, focused tests, and build
- `Deploy Preview to Vercel`
  - runs for pull requests
  - also runs on push to `main`
  - can run manually
- `Deploy Production to Vercel`
  - manual only
- `vercel.json`
  - disables direct Git-based Vercel deployments so GitHub Actions remains the control point

## Backup Notes

- Runtime uses one primary PostgreSQL `DATABASE_URL`
- MongoDB in this repository is for backup/export workflows only
- Dual-write between PostgreSQL and MongoDB is not enabled by default

Examples:

```bash
python scripts/backup_postgres_to_mongo.py "mongodb+srv://..."
```

```bash
python scripts/backup_postgres_to_mongo.py "mongodb+srv://..." "shop_backup"
```

## Related Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DEPLOY.md](./DEPLOY.md)
- [SEO-STRATEGY.md](./SEO-STRATEGY.md)
- [docs/PRD.md](./docs/PRD.md)
- [.github/SECURITY.md](./.github/SECURITY.md)
