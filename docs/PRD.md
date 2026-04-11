# PRD: Vinyl Marketplace Platform Snapshot

| Field | Value |
| --- | --- |
| Product | Vinyl Marketplace |
| Status | Current platform snapshot |
| Version | 2.0.0 |
| Target Platform | Web (desktop + mobile responsive) |
| Hosting | Vercel |
| Database | PostgreSQL |
| Payments | Stripe Checkout, PayPal, local pickup |
| Last Updated | 2026-04-11 |

## 1. Product Summary

Vinyl Marketplace is a reusable single-shop commerce platform for selling vinyl records, cassette tapes, and CDs. It combines a public storefront, a protected admin area, inventory tooling, transactional customer communication, shipping logic, PDF invoices, and live order tracking in one Next.js application.

The repository is meant to be cloned and rebranded for a specific store. The shipped branding and store profile are placeholders.

## 2. Core Product Goals

- Let a single record seller publish and manage a catalog without touching the database directly
- Give buyers enough detail to purchase collectible physical media confidently
- Support checkout flows for card payments, PayPal, and local pickup
- Keep order communication, invoices, and tracking inside the same app
- Provide a reusable technical foundation for storefront SEO, localization, and operations

## 3. Primary Users

### Buyer

Needs:

- browse by genre, format, artist, title, label, or catalog number
- view condition and release details before buying
- complete checkout with minimal friction
- receive reliable confirmation, invoice, and tracking updates

### Store admin

Needs:

- manage live products and off-sale inventory
- import stock from CSV files
- update pricing, stock, and visibility quickly
- manage shipping rules and order status
- communicate with customers directly from the order detail page

## 4. Current Capability Set

### Storefront

- multilingual storefront with locale detection and manual switching
- homepage shelves and random product highlights
- searchable, sortable catalog with format and multi-genre filters
- product pages with:
  - image gallery
  - grading details
  - label, cat number, and year
  - release notes
  - stock state
- cart refresh and stock validation before checkout
- order confirmation page
- track-order lookup page
- legal, shipping, privacy, refund, imprint, contact, and about pages

### Checkout and post-purchase

- required address-first checkout
- Stripe checkout
- PayPal create/capture flow
- local pickup path
- database-driven shipping calculation
- order confirmation emails
- shipment and status update emails
- manual admin-to-customer email capability
- PDF invoice generation and download
- live tracking sync through supported tracking providers

### Admin

- dashboard with stock and order totals
- products area for live storefront items
- inventory area for collection stock that is not currently on sale
- CSV import jobs with destination selection
- bulk status actions
- order detail page with:
  - status changes
  - tracking updates
  - VAT override
  - invoice download
  - manual customer email
- shipping rules editor
- login logs page

### SEO and operations

- sitemap and robots generation
- metadata and JSON-LD for public pages
- icon, manifest, Open Graph, and Twitter asset routes
- CI workflow
- preview deploy workflow
- manual production deploy workflow
- security audit workflow

## 5. Key Product Rules

- The platform is single-vendor, not a marketplace
- PostgreSQL is the runtime source of truth
- Inventory and catalog live in the same product model
- Admin actions control whether stock is:
  - on sale
  - sold out
  - not for sale
- Payment details are handled by providers; the app stores order and fulfillment data, not raw card details

## 6. Non-Goals

This repository does not currently aim to provide:

- multi-vendor seller accounts
- public customer accounts
- customer reviews and ratings
- promotions or discount engine
- warehouse management
- dual-write production databases
- built-in CMS outside the application content files

## 7. Launch Requirements

Before a real deployment, the operator should:

- replace the example store profile
- connect payment providers
- verify the Mailgun domain
- configure shipping rules
- test one full order lifecycle
- submit the sitemap to Search Console
- confirm public/storefront pages are indexable and admin pages are not

## 8. Success Signals

Operationally, a healthy deployment should show:

- preview deployments for review branches
- passing CI on main changes
- successful order creation from each enabled payment flow
- valid product structured data on public product pages
- successful customer email delivery
- accurate admin totals, stock, and order status handling

## 9. Customization Surfaces

The main files a new operator should update first are:

- `src/lib/site.ts`
- `src/lib/i18n/dictionaries.ts`
- `public/logo-mark.svg`
- `.env.example` and deployed environment variables

These are the highest-leverage places to turn the generic template into a live branded store.
