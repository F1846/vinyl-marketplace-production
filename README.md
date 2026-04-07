# F1846 Vinyl

Electronic music marketplace for vinyl records, cassette tapes, and CDs. Inspired by Discogs. Single-vendor MVP with Stripe checkout.

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Components)
- **Database**: PostgreSQL via Drizzle ORM (Neon/Vercel Postgres)
- **Payments**: Stripe Checkout (hosted)
- **Email**: Resend (transactional)
- **Images**: Vercel Blob
- **Styling**: Tailwind CSS (Discogs-inspired dark theme)
- **Deploy**: Vercel
- **CI/CD**: GitHub Actions (lint, typecheck, build, deploy)

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL database (Neon, Supabase, or Vercel Postgres)
- Stripe account (test mode)
- Resend account (for emails)

### Setup

```bash
# 1. Clone and install
git clone <your-repo-url>
cd vinyl-marketplace
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 3. Set up the database
npm run db:push        # or npm run db:migrate for full migrations

# 4. Seed sample data
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (whsec_...) |
| `SHIPPING_RATE_CENTS` | Flat shipping rate in cents (e.g., 899 = $8.99) |
| `ADMIN_PASSWORD` | Admin panel password (plaintext for dev) |
| `RESEND_API_KEY` | Resend API key for emails |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for images |

## Project Structure

See `ARCHITECTURE.md` for the complete architecture documentation.

### Key directories:

- `src/app/` — Next.js routes (pages, API routes, admin)
- `src/components/` — React components organized by feature
- `src/actions/` — Server Actions for mutations
- `src/hooks/` — Client-side hooks (cart, etc.)
- `src/lib/` — Singletons (database, Stripe, email)
- `src/types/` — TypeScript type definitions
- `src/validations/` — Zod schemas for all form/API inputs
- `db/` — Drizzle schema, migrations, seed data

## Stripe Webhook Setup

1. Install Stripe CLI: `stripe login`
2. Listen for events: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Copy the webhook signing secret to your `.env.local` as `STRIPE_WEBHOOK_SECRET`
4. Or configure in Stripe Dashboard: `https://yourdomain.com/api/webhooks/stripe`

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy happens automatically on push to main

### GitHub Actions CI/CD

Push to main branches triggers:
1. **CI** — lint, typecheck, build
2. **Deploy** — automatic deploy via Vercel CLI (requires `VERCEL_TOKEN` secret)

## Admin Panel

Access at `/admin`. Default password set via `ADMIN_PASSWORD` env var.

Features:
- Product CRUD with image uploads
- Order management with status updates
- Tracking number entry

## Database

Uses Drizzle ORM with PostgreSQL. Commands:

```bash
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Run migrations
npm run db:push      # Push schema directly (dev only)
npm run db:studio    # Open Drizzle Studio GUI
npm run db:seed      # Seed 10 electronic music products
```

## Seed Data

Seeds 10 electronic music releases across all three formats:
- Aphex Twin, Jeff Mills, Daft Punk, Autechre, Orbital, Boards of Canada, and more
- Formats: vinyl, cassette, CD
- Genres: Techno, House, Ambient, IDM, Drum & Bass

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type check |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed sample products |
