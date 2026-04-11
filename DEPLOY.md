# Deployment Guide

This project is documented as a reusable record-shop template. Replace example branding, contact details, domains, and sender addresses before going live.

## 1. Prepare Branding and Store Profile

Before deployment, update:

- `src/lib/site.ts`
- `src/lib/i18n/dictionaries.ts`
- `public/logo-mark.svg`
- `.env.local` or Vercel environment variables

At minimum, replace:

- store name
- domain
- support and order email addresses
- legal address
- pickup label and pickup address
- SEO keywords and descriptions

## 2. Create or Connect a GitHub Repository

```bash
git remote add origin https://github.com/<owner>/<repo>.git
git branch -M main
git push -u origin main
```

## 3. Configure Infrastructure

You need:

- PostgreSQL database
- Vercel project
- Stripe account
- Mailgun account
- Optional: PayPal account
- Optional: Ship24, 17TRACK, or AfterShip account
- Optional: Discogs token for CSV/image helpers

## 4. Set Environment Variables

Use `.env.example` as the template for both local development and Vercel.

Important groups:

- core
  - `DATABASE_URL`
  - `NEXT_PUBLIC_SITE_URL`
  - `GOOGLE_SITE_VERIFICATION`
- admin and secrets
  - `ADMIN_PASSWORD`
  - `ADMIN_PASSWORD_HASH`
  - `ADMIN_SESSION_SECRET`
  - `CHECKOUT_STATE_SECRET`
  - `INVOICE_DOWNLOAD_SECRET`
  - `CRON_SECRET`
- payments
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_ENVIRONMENT`
  - `NEXT_PUBLIC_PAYPAL_ENABLED`
- email
  - `MAILGUN_API_KEY`
  - `MAILGUN_DOMAIN`
  - `MAILGUN_BASE_URL`
  - `EMAIL_FROM`
  - `EMAIL_FROM_NAME`
  - `EMAIL_BCC`
- store profile
  - `STORE_ORDER_EMAIL`
  - `STORE_SUPPORT_EMAIL`
  - `STORE_OWNER`
  - legal and pickup address fields
- tracking
  - `TRACKING_PROVIDER`
  - provider API keys

## 5. Initialize the Database

```bash
npm install
cp .env.example .env.local
# fill in .env.local

npm run db:push
npm run db:seed
npm run shipping:apply
```

After seeding, review `/admin/shipping` and confirm the shipping rules match your business model.

## 6. Understand the Deployment Model

This repository uses GitHub Actions instead of direct Vercel Git deployments.

Current setup:

- `CI`
  - runs on push and pull request to `main`
- `Deploy Preview to Vercel`
  - runs on push to `main`
- `Deploy Production to Vercel`
  - manual-only workflow dispatch
- `vercel.json`
  - sets `"deploymentEnabled": false` under `git`

This means:

- every push to `main` gets validated and can create a preview deployment
- production deploys happen only when you trigger the production workflow

## 7. Configure Vercel

In Vercel:

1. Create or link the project.
2. Add all required environment variables.
3. Confirm the preview and production environments both have the right secrets.

GitHub secrets required by the deploy workflows:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 8. Configure Payments

### Stripe

Set the webhook endpoint to:

```text
https://your-store.example/api/webhooks/stripe
```

Use at least:

- `checkout.session.completed`

Then store the signing secret in:

- `STRIPE_WEBHOOK_SECRET`

### PayPal

Configure:

- `PAYPAL_ENVIRONMENT`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `CHECKOUT_STATE_SECRET`

## 9. Configure Email

Use a verified Mailgun domain before going live.

Recommended:

- `EMAIL_FROM="Your Store <orders@your-domain.example>"`
- `STORE_ORDER_EMAIL=orders@your-domain.example`
- `STORE_SUPPORT_EMAIL=support@your-domain.example`

Test with:

```bash
npm run email:test -- you@example.com
npm run email:test-order-flow -- you@example.com
```

## 10. Configure Tracking

Set one provider:

- `TRACKING_PROVIDER=ship24`
- or `TRACKING_PROVIDER=17track`
- or `TRACKING_PROVIDER=aftership`

Then add the matching API key.

The scheduled tracking sync route is:

```text
/api/tracking/sync
```

Protect it with `CRON_SECRET`.

## 11. Pre-Launch Checklist

- branding replaced in `site.ts` and dictionaries
- logo and favicon assets replaced
- admin password hash generated
- payments tested
- order confirmation email tested
- shipping and tracking tested
- invoice download tested
- sitemap and robots checked
- Search Console verification added
- pickup details confirmed if local pickup is enabled

## 12. Production Rollout

Suggested flow:

1. push to `main`
2. verify CI
3. verify preview deployment
4. run the production deploy workflow
5. run one live end-to-end order test
