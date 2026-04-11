# Deployment Guide

This repository is documented as a reusable record-shop template. Replace example branding, contact details, domains, sender addresses, and SEO defaults before going live.

## 1. Customize Store Identity First

Before deployment, update:

- `src/lib/site.ts`
- `src/lib/i18n/dictionaries.ts`
- `public/logo-mark.svg`
- `.env.local` or Vercel environment variables

At minimum, replace:

- store name
- public domain
- support and order email addresses
- legal address
- pickup label and pickup address
- SEO keywords and descriptions
- translated storefront copy

## 2. Create or Connect the GitHub Repository

```bash
git remote add origin https://github.com/<owner>/<repo>.git
git branch -M main
git push -u origin main
```

## 3. Provision Required Services

You need:

- PostgreSQL database
- Vercel project
- Stripe account
- Mailgun account with a verified sending domain
- Optional: PayPal account
- Optional: Ship24, 17TRACK, or AfterShip account
- Optional: Discogs token for CSV enrichment and image lookup helpers

## 4. Configure Environment Variables

Use `.env.example` as the template for both local development and Vercel.

Important groups:

- core
  - `DATABASE_URL`
  - `NEXT_PUBLIC_SITE_URL`
  - `GOOGLE_SITE_VERIFICATION`
  - `TRUST_PROXY_HEADERS`
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
- tracking
  - `TRACKING_PROVIDER`
  - provider API keys
- store profile
  - store owner
  - contact mailboxes
  - legal address
  - pickup profile

## 5. Initialize the Database

```bash
npm install
cp .env.example .env.local
# fill in .env.local

npm run db:push
npm run db:seed
npm run shipping:apply
```

After seeding:

- review `/admin/shipping`
- confirm shipping bands match your business rules
- create an admin password hash
- test the initial storefront and checkout flow locally

## 6. Configure Payments

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
- `NEXT_PUBLIC_PAYPAL_ENABLED`

## 7. Configure Email

Use a verified Mailgun domain before live traffic.

Recommended:

- `EMAIL_FROM="Your Store <orders@your-domain.example>"`
- `STORE_ORDER_EMAIL=orders@your-domain.example`
- `STORE_SUPPORT_EMAIL=support@your-domain.example`

Test with:

```bash
npm run email:test -- you@example.com
npm run email:test-order-flow -- you@example.com
```

## 8. Configure Tracking

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

## 9. Understand the Deployment Model

This repository uses GitHub Actions instead of direct Vercel Git deployments.

Current setup:

- `CI`
  - runs on pushes to `main`
  - runs on pull requests targeting `main`
- `Deploy Preview to Vercel`
  - runs on pull requests
  - runs on push to `main`
  - supports manual dispatch
- `Deploy Production to Vercel`
  - manual-only workflow dispatch
- `vercel.json`
  - sets `"deploymentEnabled": false` for direct Git deployments

This means:

- every review branch can get a preview deployment through GitHub Actions
- `main` still gets validated and previewed automatically
- production deploys happen only when you explicitly trigger the production workflow

## 10. Configure Vercel

In Vercel:

1. Create or link the project.
2. Add all required environment variables.
3. Confirm preview and production both have the right secrets.
4. Set the production domain.

GitHub secrets required by the deploy workflows:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 11. Pre-Launch Checklist

- branding replaced in `site.ts` and dictionaries
- logo and favicon assets replaced
- admin password hash generated
- Stripe tested end to end
- PayPal tested if enabled
- order confirmation emails tested
- invoice download tested
- shipping and tracking tested
- product structured data checked
- sitemap and robots checked
- Search Console verification added
- pickup details confirmed if local pickup is enabled
- review preview deployment before production rollout

## 12. Suggested Launch Flow

1. open a pull request
2. verify CI and preview deployment
3. test one full order in the preview or staging environment
4. merge to `main`
5. verify the post-merge preview deployment
6. trigger the manual production deploy workflow
7. run one live end-to-end order test after production release
