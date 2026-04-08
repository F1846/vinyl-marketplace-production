# Federico Shop

Production codebase for Federico Shop, an editorial storefront for electronic music records, tapes, and CDs with admin tools for catalog, shipping, checkout, invoices, and order tracking.

## Live Site

- Storefront: [https://www.federicoshop.de](https://www.federicoshop.de)
- Catalog: [https://www.federicoshop.de/catalog](https://www.federicoshop.de/catalog)
- Order tracking: [https://www.federicoshop.de/track-order](https://www.federicoshop.de/track-order)
- Admin login: [https://www.federicoshop.de/admin](https://www.federicoshop.de/admin)

## What Is Included

- Editorial storefront with responsive catalog, product pages, and homepage shelves
- Auto-detected storefront language with manual language switcher
- Stripe Checkout, PayPal checkout, and Berlin local pickup
- Mandatory checkout address step before payment
- Country and quantity based shipping rules managed in admin
- PDF invoice downloads for customers and admins
- Transactional order emails via Mailgun
- Live tracking support with Ship24, plus 17TRACK or AfterShip fallback
- Admin order tools for status updates, tracking numbers, VAT, invoice download, and pickup handling
- Admin product tools for edit, archive, hide/show, and sold-out relist
- Discogs CSV import workflow with Discogs image lookup
- SEO support with sitemap, robots, structured data, and Google verification tag support
- GitHub Actions CI and Vercel production deploy

## Tech Stack

- Framework: Next.js 15 App Router
- Runtime: React 19
- Database: PostgreSQL with Drizzle ORM
- Styling: Tailwind CSS
- Payments: Stripe Checkout and PayPal
- Email: Mailgun
- Storage: Vercel Blob
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
- Optional: Discogs user token

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
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key Environment Variables

See [.env.example](./.env.example) for the complete list.

### Core

- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `GOOGLE_SITE_VERIFICATION`

### Admin

- `ADMIN_PASSWORD`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

### Checkout

- `STRIPE_MODE`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_ENVIRONMENT`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `CHECKOUT_STATE_SECRET`

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
- `CRON_SECRET`

### Catalog and Media

- `BLOB_READ_WRITE_TOKEN`
- `DISCOGS_USER_TOKEN`
- `DISCOGS_USER_AGENT`

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
| `npm run catalog:import-discogs -- "path-to-csv"` | Import catalog rows from a Discogs style inventory CSV |
| `npm run shipping:apply` | Apply shipping rate seed rules |
| `npm run email:test -- you@example.com` | Send a transactional email test |
| `npm run email:test-order-flow -- you@example.com` | Send order flow email tests |

## Admin Features

The admin area is designed for a single-shop workflow.

- Dashboard with product and order totals
- Product list with sort controls for price, stock, and status
- Product actions for edit, archive, hide/show, and relist
- Shipping rules editor
- Order detail page with:
  - status updates
  - tracking number and carrier or tracking URL
  - VAT override
  - PDF invoice download
  - pickup details
- Absolute session expiry after login for admin security

## Orders and Customer Flow

- Cart and checkout collect full customer details before payment
- Card payments create orders through Stripe webhooks
- PayPal orders use a signed return flow
- Local pickup orders show fixed pickup details
- Customers can track orders at `/track-order`
- Customers can download invoice PDFs from order emails and order lookup
- Order emails share a consistent Federico Shop layout and subject style

## Shipping Model

Shipping is database-driven and can be updated in admin. Current rules are based on destination country, total item count, and whether the cart contains vinyl.

Examples:

- Germany vinyl carts: `6 EUR` up to 5 items, then `10 EUR`
- Europe vinyl carts: `14 EUR` up to 3 items, then `+2 EUR` per additional item
- UK and Switzerland vinyl carts: `21 EUR` up to 2 items, then `+2 EUR` per additional item
- Germany cassette or CD only carts: `4 EUR`
- Europe cassette or CD only carts: `10 EUR`
- UK and temporary rest-of-world cassette or CD only carts: `14 EUR`
- Palestine: `30 EUR` fixed up to 10 items

Mixed-format carts are calculated once per whole cart, not added separately by medium.

## Email and Tracking Notes

### Mailgun

- Use a verified Mailgun domain for production sending
- Set `EMAIL_FROM` to a verified sender such as `Federico Shop DE <orders@federicoshop.de>`
- Incoming support and order mailbox forwarding can be handled separately at the DNS or provider level

### Tracking

- `ship24` is the preferred live tracking provider
- `17track` is supported as a free alternative
- `aftership` remains available if needed
- Admins can also store a direct tracking URL template

## Deployment

### Vercel

1. Push to GitHub
2. Connect the repository to Vercel
3. Add production environment variables
4. Redeploy production

### Stripe Webhook

Use:

```text
https://www.federicoshop.de/api/webhooks/stripe
```

### Scheduled Tracking Sync

Set a cron job to call:

```text
/api/tracking/sync
```

with the `CRON_SECRET` header or query value expected by the route.

## Project Structure

- `src/app/` - App Router pages, route handlers, admin pages, checkout, tracking
- `src/components/` - storefront, admin, and shared React components
- `src/actions/` - server actions for products, orders, shipping, and admin updates
- `src/lib/` - database, auth, checkout, email, invoices, SEO, tracking, site config
- `src/hooks/` - client hooks such as cart state
- `src/types/` - shared TypeScript types
- `src/validations/` - Zod schemas
- `db/` - schema, migrations, and seed data
- `scripts/` - one-off maintenance, email, shipping, and import scripts
- `.github/workflows/` - CI, deploy, and CodeQL workflows

## Security and Ops

- Admin routes are intentionally `noindex`
- Cart, checkout, order confirmation, and API routes are intentionally `noindex`
- Public storefront pages are indexable
- Repo security policy lives in [.github/SECURITY.md](./.github/SECURITY.md)
- Code scanning is configured with GitHub CodeQL

## Related Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DEPLOY.md](./DEPLOY.md)
- [SEO-STRATEGY.md](./SEO-STRATEGY.md)
