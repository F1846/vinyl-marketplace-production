# PRD: Vinyl Marketplace MVP

| Field | Value |
|---|---|
| **Author** | Product Management |
| **Status** | Draft |
| **Version** | 1.0.0 |
| **Target Platform** | Web (desktop + mobile responsive) |
| **Hosting** | Vercel (Next.js App Router, fullstack) |
| **Database** | PostgreSQL |
| **Payments** | Stripe Checkout |
| **Last Updated** | 2026-04-07 |

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-04-07 | Initial draft |

---

## 1. Problem Statement

Physical media collectors and music fans who want to buy vinyl records, cassette tapes, and CDs currently face a fragmented purchasing experience. They must browse multiple seller storefronts, individual social media accounts, or general e-commerce platforms not optimized for physical media attributes (condition grading, pressing info, format). Meanwhile, small sellers of physical media lack a focused storefront that communicates collector-relevant product details.

**Current pain points:**
- No dedicated e-commerce experience for physical media with format-specific metadata (media condition, sleeve condition, pressing, catalog number).
- General marketplaces bury product details under generic fields, forcing buyers to message sellers for critical information.
- Sellers must manually manage orders across spreadsheets or multiple platforms instead of a single admin panel.

**Business impact:**
- Physical media sales continue to grow (vinyl revenue has grown for 17 consecutive years in the US alone). The addressable market of collectors and casual buyers is proven.
- A focused storefront reduces friction between discovery and purchase, directly increasing conversion rate versus browsing on social media or forums.
- The opportunity for the MVP phase is a single-vendor catalog that validates demand before investing in multi-vendor infrastructure.

**Target outcome:** Validate that a focused physical media storefront converts at a rate comparable to or higher than general e-commerce for this niche (industry baseline: 2-3% for hobby/collectible e-commerce). If conversion meets or exceeds 2.5%, we proceed to multi-vendor expansion.

---

## 2. Target Personas

### Persona 1: The Dedicated Collector

| Attribute | Detail |
|---|---|
| **Name** | "Diana" |
| **Age range** | 28-55 |
| **Tech sophistication** | Medium to high. Comfortable with online payments, expects detailed product information. |
| **Goals** | Find specific pressings, verify condition, purchase with confidence in item accuracy. |
| **Constraints** | Limited budget for rare items, needs assurance about product condition before buying. |
| **Job to be done** | "I want to verify the exact pressing, condition, and format of a record so I can make a confident purchase without messaging the seller." |
| **Behavioral signals** | Reads full product descriptions, compares prices, checks seller reputation, returns if item does not match description. |

### Persona 2: The Casual Buyer

| Attribute | Detail |
|---|---|
| **Name** | "Marcus" |
| **Age range** | 18-35 |
| **Tech sophistication** | High. Expects Amazon-level checkout speed and mobile responsiveness. |
| **Goals** | Browse by genre or artist, discover new or popular releases, complete purchase quickly. |
| **Constraints** | Impulse-driven purchases, high sensitivity to checkout friction (abandons if more than 2 pages). |
| **Job to be done** | "I want to find an album I know I like and check out in under 2 minutes so I do not lose the impulse to buy." |
| **Behavioral signals** | Browses by artist/genre, filters by format quickly, prefers guest checkout over account creation. |

---

## 3. User Stories

### EPIC-1: Product Catalog

#### US-1.1: Browse Catalog with Filters

**Story:** As a casual buyer, I want to browse the full catalog filtered by format (vinyl/cassette/CD), genre, and price range, so that I can find items that match my interests without scrolling through irrelevant products.

**Acceptance Criteria:**

**AC-1 (Happy path - filtering):**
- Given I am on the catalog page
- When I select format = "Vinyl" and genre = "Rock"
- Then the product grid shows only vinyl records in the rock genre
- And the count of results is displayed (e.g., "12 results")
- And each product card shows the album cover, artist name, album title, price, and format badge

**AC-2 (Happy path - search):**
- Given I am on the catalog page
- When I type "Pink Floyd" into the search box and press Enter
- Then the results show products matching that query, ranked by relevance
- And the first page shows up to 20 results
- And a "Load more" button or infinite scroll loads the next 20 results

**AC-3 (Edge case - no results):**
- Given I am on the catalog page
- When I apply filters that match no products
- Then I see a friendly empty state message ("No items match your filters")
- And a "Clear all filters" button is displayed that resets to the unfiltered catalog

**AC-4 (Performance):**
- Given I am on the catalog page
- When the page first loads
- Then the initial render of up to 20 product cards occurs within 2 seconds on a 3G-fast connection
- And pagination or load-more does not exceed 1 second for subsequent pages

---

#### US-1.2: Product Detail Page

**Story:** As a dedicated collector, I want to see all relevant product details, condition grading, and photos before adding to cart, so that I can verify the item matches my collection needs.

**Acceptance Criteria:**

**AC-1 (Happy path - detail display):**
- Given I click a product card from the catalog
- When the product detail page loads
- Then I see: product image(s), artist name, album title, format (vinyl/cassette/CD), price, condition grade (M/VG+/VG/G/Poor for media and sleeve separately, when applicable), pressing info (label, year, catalog number), and description
- And an "Add to Cart" button is visible and enabled when stock > 0

**AC-2 (Happy path - multi-image):**
- Given the product has multiple images
- When I view the product detail page
- Then a thumbnail gallery is shown alongside the main image
- And clicking a thumbnail updates the main image
- And arrow navigation (left/right) cycles through images

**AC-3 (Edge case - out of stock):**
- Given a product has stock = 0
- When I view the product detail page
- Then the "Add to Cart" button is replaced with a "Sold Out" badge (disabled button)
- And the product card in the catalog shows a "Sold Out" overlay
- And the product still appears in the catalog but is sorted to the end of results when sorted by newest

**AC-4 (Error state - missing product):**
- Given I navigate to a product URL with an ID that does not exist or has been deleted
- When the page loads
- Then I see a 404 page with a link back to the catalog
- And the page returns HTTP 404 status code (not a soft 404)

---

### EPIC-2: Shopping Cart

#### US-2.1: Cart Management

**Story:** As a casual buyer, I want to add items to a cart, update quantities, and remove items, so that I can review my order before paying.

**Acceptance Criteria:**

**AC-1 (Happy path - add to cart):**
- Given I am on a product detail page with available stock
- When I click "Add to Cart"
- Then the item is added to the cart
- And a confirmation toast or banner appears ("Added to cart" with item name)
- And the cart icon in the header updates to show the total item count

**AC-2 (Happy path - cart review):**
- Given I have items in my cart
- When I navigate to the cart page
- Then I see each item with its image, name, format, price, quantity selector, and line total
- And I see a subtotal, estimated shipping line, and order total
- And I can update the quantity (1-10 per item) and the totals recalculate instantly
- And I can remove any item entirely via a "Remove" button

**AC-3 (Edge case - quantity exceeds stock):**
- Given a product has 2 units in stock
- When I try to set the quantity to 3 in the cart
- Then the quantity is clamped to 2
- And an inline message appears ("Only 2 available")

**AC-4 (Error state - item sold out in cart):**
- Given I have an item in my cart
- When that item sells out while it is in my cart
- And I then view or try to checkout from the cart
- Then the item is marked as "No longer available" and moved to a separate "Unavailable items" section
- And the "Proceed to Checkout" button is disabled until no unavailable items remain
- And I can remove unavailable items with a single action

---

### EPIC-3: Checkout

#### US-3.1: Stripe Checkout Integration

**Story:** As a casual buyer, I want to enter my shipping and payment details and complete the purchase so that I receive a confirmation and my order is fulfilled.

**Acceptance Criteria:**

**AC-1 (Happy path - checkout flow):**
- Given I have at least one available item in my cart
- When I click "Proceed to Checkout"
- Then I am redirected to Stripe Checkout (hosted page) with my cart items, subtotal, shipping, and total pre-filled
- And I can enter shipping address and payment details on the Stripe page
- And upon successful payment, I am redirected back to a confirmation page on the marketplace

**AC-2 (Happy path - order confirmation):**
- Given I have successfully paid on Stripe
- When I am redirected to the confirmation page
- Then I see an order confirmation with: order number, items purchased, total paid, shipping address, and expected delivery window (5-7 business days for domestic)
- And an order confirmation email is sent to the email address I provided

**AC-3 (Edge case - payment failure):**
- Given I am on the Stripe Checkout page
- When my payment is declined
- Then Stripe shows the payment error
- And I am redirected back to the marketplace checkout page
- And my cart is preserved so I can retry payment
- And no order is created in the database

**AC-4 (Error state - webhook failure):**
- Given a Stripe payment was successful
- When the Stripe webhook fails to deliver within 30 seconds
- Then the webhook endpoint returns a 200 status code to Stripe (acknowledging receipt)
- And the system retries processing the order asynchronously
- And an alert is logged for admin review
- And the maximum retry window is 72 hours before manual reconciliation is required

---

### EPIC-4: Order Tracking

#### US-4.1: Order Confirmation Email and Status Page

**Story:** As a dedicated collector, I want to track my order status after purchase so that I know when to expect delivery.

**Acceptance Criteria:**

**AC-1 (Happy path - order status query):**
- Given I have placed an order
- When I visit `/track-order` and enter my order number and email address
- Then I see my order status (Pending, Processing, Shipped, Delivered), items, tracking number (if Shipped), and ship date
- And I see the full order history timeline with timestamped events

**AC-2 (Happy path - status transitions):**
- Given I place an order
- When the payment is confirmed
- Then the order status is set to "Processing"
- And when an admin marks the order as shipped with a tracking number
- Then the order status changes to "Shipped"
- And the tracking number and carrier are visible on the order status page

**AC-3 (Edge case - invalid tracking query):**
- Given I enter an order number and email
- When either the order number does not exist or the email does not match
- Then I see a generic message ("If you have a recent order, you will see its status here.") to avoid information leakage
- And no details about existing orders are revealed

**AC-4 (Edge case - no orders yet):**
- Given the customer has not placed any orders
- When I visit `/track-order`
- Then I see an empty state with guidance ("Track your order by entering the order number and email you used at checkout")

---

### EPIC-5: Admin Panel

#### US-5.1: Product CRUD

**Story:** As an admin (store owner), I want to create, read, update, and delete products so that I can manage the catalog without database access.

**Acceptance Criteria:**

**AC-1 (Happy path - create product):**
- Given I am authenticated as an admin
- When I fill in the "Add Product" form with: artist name, album title, format (vinyl/cassette/CD), price, stock quantity, condition grade, pressing details (label, year, catalog number), description, and at least one product image
- And I click "Save"
- Then the product is created with the provided details
- And the product appears in the admin product list
- And the product appears on the public catalog page within 5 seconds

**AC-2 (Happy path - update product):**
- Given I am authenticated as an admin
- When I edit an existing product and change any field (price, stock, description, images)
- And I click "Save"
- Then the changes are persisted
- And the product detail page reflects the updated values on next load

**AC-3 (Happy path - delete / soft-delete product):**
- Given I am authenticated as an admin
- When I delete a product that has never been ordered
- Then the product is soft-deleted (status = "archived")
- And the product no longer appears in the public catalog
- And the product remains queryable in the admin panel with an "archived" badge

**AC-4 (Edge case - image upload failure):**
- Given I am creating a product
- When the product image upload fails (network error, file too large > 5 MB, wrong format)
- Then I see an inline error message on the image upload field ("Upload failed. Accepted formats: JPG, PNG, WebP. Maximum size: 5 MB.")
- And I can retry the upload without losing other form data
- And the draft form data is preserved in the browser until the form is abandoned or submitted

**AC-5 (Error state - concurrent stock update):**
- Given two admin sessions both have the same product open
- When both attempt to update the product simultaneously
- Then the second save is rejected with a conflict message ("This product was updated by another session. Please refresh and retry.")
- And no data is silently overwritten

---

#### US-5.2: Admin Order Management

**Story:** As an admin, I want to view orders, update their status, and add tracking information so that I can fulfill orders and keep customers informed.

**Acceptance Criteria:**

**AC-1 (Happy path - view orders):**
- Given I am authenticated as an admin
- When I visit the admin orders page
- Then I see a paginated list of all orders with order number, customer email, total, status, and date
- And orders are sorted by newest first
- And I can filter by status (Pending, Processing, Shipped, Delivered)

**AC-2 (Happy path - mark as shipped):**
- Given I have an order in "Processing" status
- When I open the order detail and enter a carrier name and tracking number
- And I click "Mark as Shipped"
- Then the order status updates to "Shipped"
- And the tracking number and carrier are stored with the order
- And a shipping confirmation email is sent to the customer (deferred, tracked in a follow-up ticket if email is out of MVP scope)

**AC-3 (Edge case - update delivered):**
- Given an order is in "Shipped" status
- When I manually mark it as "Delivered"
- Then the order status updates
- And the delivered timestamp is recorded

**AC-4 (Error state - no updates on cancelled orders):**
- Given an order is associated with a failed or cancelled payment
- When I attempt to update its status
- Then the action is rejected
- And a message appears ("Cannot update cancelled orders")

---

## 4. Prioritization Matrix (RICE)

RICE scores are calculated as **(Reach x Impact x Confidence) / Effort** where Effort is in person-weeks. Reach is the number of users affected per month. Impact is scored as 3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal. Confidence is 0.5-1.0 reflecting how certain we are. Effort is engineering person-weeks.

| Feature | Reach (users/month) | Impact (3-0.25) | Confidence | Effort (person-weeks) | RICE Score | Reasoning |
|---|---|---|---|---|---|---|
| US-1.1 Browse catalog | 500 | 3 (massive) | 0.9 | 2 | 675 | Every user interacts with the catalog. Without browsing there is no conversion. Core to validating the concept. |
| US-1.2 Product detail | 400 | 3 (massive) | 0.9 | 2 | 540 | Collectors need detailed condition and pressing info. High impact on conversion confidence. |
| US-2.1 Cart management | 350 | 2 (high) | 0.85 | 1.5 | 397 | Necessary bridge between browsing and checkout. Slightly lower reach since not all browsers add to cart. |
| US-3.1 Stripe checkout | 200 | 3 (massive) | 0.95 | 2.5 | 228 | Directly tied to revenue. Lower reach because only buyers reach checkout, but maximum impact. |
| US-4.1 Order tracking | 150 | 1 (medium) | 0.8 | 1.5 | 64 | Post-purchase experience. Medium impact on retention. Can be deferred if needed but included in MVP for completeness. |
| US-5.1 Admin product CRUD | 10 (admins) | 2 (high) | 0.9 | 3 | 6 | Low reach (internal-only) but high impact because no catalog without it. Could use direct DB seeding for launch but not sustainable. |
| US-5.2 Admin order management | 10 (admins) | 2 (high) | 0.85 | 2 | 8.5 | Required to fulfill orders. Tied to operational capability. |

**Recommended MVP sequencing (by Sprint, 2-week sprints):**

| Sprint | Deliverables | Notes |
|---|---|---|
| Sprint 1 | Database schema, admin auth, US-5.1 (Product CRUD), seed data | Foundation work. Without catalog data nothing else can be built. |
| Sprint 2 | US-1.1 (Browse catalog), US-1.2 (Product detail) | Public-facing read side. Must follow Sprint 1 data availability. |
| Sprint 3 | US-2.1 (Cart), US-3.1 (Stripe Checkout) | Revenue-producing features. Depends on catalog + cart. |
| Sprint 4 | US-4.1 (Order tracking), US-5.2 (Admin order management), email confirmations | Post-purchase experience and operational tools. |

---

## 5. Scope

### In Scope (MVP)

- Single-vendor product catalog (one store owner, multiple products)
- Product attributes: artist, album title, format (vinyl/cassette/CD), price, stock quantity, condition grade (media + sleeve), pressing details, description, images
- Browse with filters: format, genre, price range, search
- Product detail page with image gallery
- Shopping cart with quantity management
- Stripe Checkout (hosted page) integration
- Order creation on successful payment via Stripe webhooks
- Order status tracking page (public) accessed via order number + email
- Admin panel: product CRUD, order list, order status updates with tracking number
- Basic confirmation email sent on successful payment
- Responsive design for desktop, tablet, and mobile
- Guest checkout (no required account creation)
- Stripe webhooks for order confirmation and idempotency

### Explicitly Out of Scope (Post-MVP)

- Multi-vendor marketplace (this is single-vendor only)
- User accounts and authentication (guest checkout only)
- Reviews and ratings
- Wishlists or saved items
- Seller dashboards (only one admin store owner)
- Recommendation engine ("you may also like")
- Shipping rate calculation (flat rate only for MVP)
- International shipping or multi-currency
- Discount codes or promotions
- Inventory sync across warehouses
- Analytics dashboard for admin
- SEO optimization beyond basic meta tags
- PWA / installable app
- Social login

---

## 6. Success Metrics

| Metric | Baseline | Target (within 60 days of launch) | Measurement Method | Decision Rule |
|---|---|---|---|---|
| Conversion rate (visitor to completed checkout) | 0% (new product) | >= 2.5% | Stripe successful checkouts / unique site visitors (from Vercel Analytics) | If < 1.5%: investigate checkout friction and catalog quality before further investment. If >= 2.5%: proceed to multi-vendor scoping. |
| Cart abandonment rate | 0% (new product) | <= 60% | Cart sessions without completed checkout / total cart sessions | If > 70%: prioritize shipping cost transparency and guest checkout UX improvements. |
| Average order value (AOV) | $0 (new product) | >= $35 USD | Total revenue / completed orders (from Stripe) | If < $25: explore bundling or minimum order incentives in v2. |
| Time to first sale | 0 days | Within 7 days of public launch | Stripe checkout session creation | If > 14 days: verify marketing acquisition channels before iterating on product. |
| Admin catalog update efficiency | Manual DB edits | <= 30 seconds to create a product | Manual stopwatch test during admin demo | If > 2 minutes: improve admin form UX or image upload in v2. |

---

## 7. Technical Considerations

### Architecture

- **Framework**: Next.js App Router with Server Actions for form submissions and API routes for Stripe webhooks.
- **Deployment**: Vercel. Use Vercel Postgres or a managed PostgreSQL provider (Supabase, Neon, or Railway).
- **Frontend**: React Server Components by default. Client components only where interactivity is required (cart, forms, image gallery).
- **Styling**: Tailwind CSS (recommended for Next.js projects) or CSS Modules. Ensure responsive breakpoints for mobile-first design.

### Database (PostgreSQL)

**Core tables:**

| Table | Purpose | Key columns |
|---|---|---|
| `products` | Product catalog | `id` (uuid v7), `artist`, `title`, `format` (enum: vinyl/cassette/cd), `genre`, `price_cents` (integer), `stock_quantity`, `condition_media` (enum), `condition_sleeve` (enum, nullable for non-vinyl), `pressing_label`, `pressing_year`, `pressing_catalog_number`, `description`, `status` (enum: active/sold_out/archived), `created_at`, `updated_at` |
| `product_images` | Product images | `id` (uuid v7), `product_id` (FK), `url`, `sort_order`, `created_at` |
| `orders` | Order records | `id` (uuid v7), `order_number` (human-readable, e.g., VM-20260407-0001), `customer_email`, `customer_name`, `shipping_address` (jsonb), `subtotal_cents`, `shipping_cents`, `tax_cents`, `total_cents`, `status` (enum: pending/processing/shipped/delivered/cancelled), `tracking_number`, `tracking_carrier`, `stripe_session_id`, `stripe_payment_intent_id`, `created_at`, `updated_at` |
| `order_items` | Order line items | `id` (uuid v7), `order_id` (FK), `product_id` (FK), `quantity`, `price_at_purchase_cents`, `created_at` |

**Indexes:**
- `idx_products_format_genre` on products (format, genre) for catalog filtering
- `idx_products_status_created` on products (status, created_at DESC) for catalog ordering
- `idx_orders_stripe_session` on orders (stripe_session_id) for webhook lookup
- `idx_orders_email_number` on orders (customer_email, order_number) for order tracking
- `idx_order_items_order` on order_items (order_id) for order detail lookup

### Stripe Integration

- Use **Stripe Checkout** (hosted page), not Elements or Payment Element embedded flows (lower implementation effort for MVP).
- Pass line items from the cart to Stripe Checkout session creation.
- Store `stripe_session_id` and `stripe_payment_intent_id` on orders for reconciliation.
- Set up a webhook endpoint (`/api/webhooks/stripe`) to listen for `checkout.session.completed` events.
- Implement webhook signature verification using Stripe's SDK (`constructEvent`).
- Ensure idempotency: if the same `checkout.session.completed` event is received twice, do not create duplicate orders.
- Configure success and cancel redirect URLs on Stripe Checkout to point back to `/order-confirmation` and `/cart` respectively.
- Use webhooks for order creation, not the client-side redirect (clients can be lost before redirect).

### Image Hosting

- Store product images on Vercel Blob Storage, Cloudinary, or AWS S3.
- Image requirements: JPG, PNG, or WebP. Maximum 5 MB per image. Maximum 5 images per product.
- Use Next.js `<Image>` component for automatic optimization (WebP/AVIF conversion, responsive sizing).
- Generate thumbnails at upload time (or let Vercel Blob/Cloudinary handle variants).

### Authentication (Admin Only)

- Admin panel protected by Next.js Route Handlers with session-based auth or a simple token-based system.
- For MVP simplicity: use NextAuth.js or a basic password-protected admin route with an environment variable credential.
- No public-facing user accounts in MVP.

### Email

- Use a transactional email service (Resend, SendGrid, or Postmark) for order confirmation emails.
- Confirmation email template: order number, items, total, shipping address, and expected delivery window.
- Shipping confirmation email (post-MVP stretch goal): tracking number and carrier.

### Performance Requirements

- Time to First Byte (TTFB): < 500ms for SSR pages (Next.js server rendering).
- Page load: < 2 seconds for catalog and product detail on 3G-fast.
- Stripe Checkout redirect: < 3 seconds to load the hosted page.
- Image delivery: use CDN-backed storage (provided by Vercel Blob or Cloudinary).

### Security Considerations

- All webhook endpoints must verify Stripe signatures.
- Admin routes must be behind authentication.
- Price values stored as integer cents (never floating point) to avoid rounding errors.
- Shipping address and customer email stored in plaintext (required for fulfillment). Payment details never stored (handled by Stripe).
- Input validation on all admin form submissions using Zod schema.

---

## 8. Risks and Mitigations

| Risk | Likelihood | Severity | Impact if Realized | Mitigation |
|---|---|---|---|---|
| Stripe webhook delivery failures cause lost orders | Medium | High | Revenue attributed incorrectly, customer confusion | Idempotent webhook handlers, retry logic, admin manual reconciliation UI. Log all webhook events. |
| Image uploads are slow or unreliable | Medium | Medium | Admin cannot add products efficiently | Use a managed image service (Cloudinary or Vercel Blob) with built-in CDN. Set clear file size limits (5 MB). |
| Stripe Checkout feels disconnected from the marketplace | High | Low | Users may drop off during redirect | Show a loading state during redirect. Pre-fill customer email on checkout flow to reduce friction. Test redirect timing. |
| Catalog search relevance is poor | Medium | Medium | Users cannot find items, bounce rate increases | Use PostgreSQL full-text search (tsvector) for MVP, which is adequate for <1000 items. Reassess if catalog exceeds 5000 items. |
| Admin CRUD without UX polish slows operations | Low | Low | Admin creates errors in product listings | Form validation (Zod) with inline error messages before submission. Confirmation dialog for deletes. |
| Concurrent stock edits cause overselling | Low | High | Customer pays for out-of-stock item | Use optimistic row-level checks at checkout session creation. If stock has decreased below cart quantity, reject checkout with a clear message. |
| Scope creep extends timeline beyond 4 sprints | Medium | Medium | Delayed validation of core thesis | Strict enforcement of "out of scope" list above. Any new feature requires explicit PRD amendment and stakeholder sign-off. |

---

## 9. Rollout Plan

### Phase 1: Internal Launch (Week 1)

- Deploy staging environment on a Vercel preview deployment.
- Admin seeds 20-50 products across all three formats (vinyl, cassette, CD).
- Internal team exercises the full flow: browse, add to cart, checkout with Stripe test mode, order tracking.
- Verify webhook delivery in Stripe test mode.
- Checklist:
  - [ ] All user stories meet acceptance criteria in staging.
  - [ ] Stripe test mode: successful payment and declined payment flows verified.
  - [ ] Webhook endpoint verified with Stripe CLI.
  - [ ] Order tracking page accessible with test order.
  - [ ] Admin CRUD verified (create 5, update 2, delete 1).
  - [ ] Mobile responsive testing on iOS Safari and Android Chrome.
  - [ ] Accessibility: keyboard navigation and screen reader spot-check (NVDA or VoiceOver).

### Phase 2: Soft Launch (Weeks 2-3)

- Deploy to production with a small group of beta users (20-50 known customers from the target audience).
- Use Stripe live mode with real payments.
- Send personal invitations to collect the first real orders.
- Monitor:
  - Stripe dashboard for checkout sessions, successful/failed payments.
  - Vercel Analytics for page load times and error rates.
  - Webhook delivery logs for failed or delayed events.
  - Support inbox for customer questions and issues.
- **Rollback criteria**: If > 10% of payment sessions result in errors or webhooks fail to process > 5% of events, revert to staging and investigate.

### Phase 3: Public Launch (Week 4+)

- Announce launch to broader audience via social media, forums, and email.
- Remove any beta-only notices.
- Production monitoring:
  - Stripe payment success rate (target: > 95%).
  - Order confirmation email delivery rate (target: > 98%).
  - Site uptime (Vercel handles this; verify via UptimeRobot or similar).
- Collect qualitative feedback from first 50 customers via a short post-purchase survey (email link, max 5 questions).

### Feature Flagging

- No dedicated feature flag system is needed for MVP. Use environment variables to toggle behavior:
  - `STRIPE_MODE`: `test` or `live` to switch Stripe environments.
  - `ENABLE_ORDER_TRACKING`: `true` to gate the tracking page if needed (default `true`).
  - `ENABLE_ADMIN`: `true` to gate admin panel routes (default `true`).

---

## 10. Open Questions

| # | Question | Owner | Target Date |
|---|---|---|---|
| 1 | What is the flat shipping rate for domestic orders? | Store owner | Sprint 1 |
| 2 | What are the condition grading labels exactly? (e.g., Goldmine Standard: M/NM/VG+/VG/G/P/F) | Store owner | Sprint 1 |
| 3 | Do we need tax calculation, or is the price shown tax-inclusive? | Store owner | Sprint 1 |
| 4 | What is the confirmation email sender address and brand name? | Store owner | Sprint 2 |
| 5 | Should product URLs use slugs (`/products/pink-floyd-dark-side-of-the-moon`) or UUIDs (`/products/abc-123`)? | Engineering | Sprint 1 |
| 6 | What is the maximum number of products expected at launch? This impacts search strategy (full-text vs external search engine). | Store owner | Sprint 1 |

---

## Appendix A: Condition Grade Reference

For vinyl records, condition grading applies to both the media (the record itself) and the sleeve (cover/packaging). For cassettes and CDs, only a single condition grade is used.

| Grade | Label | Description |
|---|---|---|
| M | Mint | Perfect. No visible flaws. Playable without any noise. |
| NM | Near Mint | Almost perfect. Minimal wear, may show slight signs of handling. |
| VG+ | Very Good Plus | Shows some signs of use but plays with minimal noise. |
| VG | Very Good | Significant signs of use and wear. May have surface noise. |
| G | Good | Heavy wear. Obvious noise and scratches but still playable. |
| P | Poor | Major damage. Unplayable, record-warping, or splitting. |

This follows the Goldmine Grading Standard. The admin form should present these as a dropdown with a short description visible on hover or selection.

---

## Appendix B: API Route Map (MVP)

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/` | GET | Home page (featured/new arrivals) | Public |
| `/catalog` | GET | Catalog page with filters | Public |
| `/catalog?format=&genre=&q=&page=` | GET | Filtered/paginated catalog | Public |
| `/products/[id]` | GET | Product detail page | Public |
| `/cart` | GET | Shopping cart page | Public |
| `/cart` | POST | Update cart (session/cookie based) | Public |
| `/api/checkout/create` | POST | Create Stripe Checkout session | Public |
| `/api/webhooks/stripe` | POST | Receive Stripe events | Verified via signature |
| `/track-order` | GET | Order tracking page (form) | Public |
| `/api/orders/lookup` | POST | Query order by number + email | Public |
| `/admin` | GET | Admin dashboard | Admin only |
| `/admin/products` | GET | Product list | Admin only |
| `/admin/products/new` | GET/POST | Create product | Admin only |
| `/admin/products/[id]/edit` | GET/POST/DELETE | Update/delete product | Admin only |
| `/admin/orders` | GET | Order list with filters | Admin only |
| `/admin/orders/[id]` | GET/PATCH | Order detail, update status | Admin only |
