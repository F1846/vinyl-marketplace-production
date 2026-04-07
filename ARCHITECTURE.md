# Vinyl Marketplace — Architecture

## Project Structure

```
vinyl-marketplace/
├── .env.example                  # Environment variable template
├── .gitignore
├── next.config.ts                # Next.js configuration (Image domains, redirects)
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── postcss.config.mjs            # PostCSS configuration
├── components.json               # shadcn/ui configuration (if used)
├── package.json                  # Project dependencies + scripts
├── drizzle.config.ts             # Drizzle ORM configuration
│
├── docs/
│   └── PRD.md                    # Product requirements document
│
├── ARCHITECTURE.md               # This file
│
├── db/
│   ├── schema.ts                 # Drizzle ORM table definitions, enums, relations
│   ├── index.ts                  # Shared database client export
│   └── migrations/
│       └── 001_initial.sql       # Initial migration (enums, tables, indexes, triggers)
│
├── public/                       # Static assets (favicon, og images, etc.)
│
└── src/
    ├── app/                      # Next.js App Router
    │   ├── layout.tsx            # Root layout (fonts, metadata, providers)
    │   ├── page.tsx              # Home page (featured / new arrivals)
    │   ├── not-found.tsx         # Global 404 page
    │   │
    │   ├── catalog/
    │   │   ├── page.tsx          # Catalog listing with filters (Server Component)
    │   │   └── loading.tsx       # Skeleton loader
    │   │
    │   ├── products/
    │   │   └── [id]/
    │   │       ├── page.tsx      # Product detail page (Server Component)
    │   │       └── not-found.tsx # 404 for deleted / missing products
    │   │
    │   ├── cart/
    │   │   └── page.tsx          # Shopping cart page (Client Component)
    │   │
    │   ├── checkout/
    │   │   └── route.ts          # POST — creates Stripe Checkout session
    │   │
    │   ├── order-confirmation/
    │   │   └── page.tsx          # Post-payment confirmation page
    │   │
    │   ├── track-order/
    │   │   └── page.tsx          # Order lookup form + status display
    │   │
    │   ├── api/
    │   │   ├── webhooks/
    │   │   │   └── stripe/
    │   │   │       └── route.ts  # Stripe webhook handler (POST)
    │   │   └── orders/
    │   │       └── lookup/
    │   │           └── route.ts  # Public order lookup API (POST)
    │   │
    │   └── admin/
    │       ├── layout.tsx        # Admin layout (auth gate, sidebar nav)
    │       ├── page.tsx          # Admin dashboard overview
    │       ├── login/
    │       │   └── page.tsx      # Admin login page
    │       ├── products/
    │       │   ├── page.tsx      # Product list with search + status filter
    │       │   ├── new/
    │       │   │   └── page.tsx  # Create product form
    │       │   └── [id]/
    │       │       └── edit/
    │       │           └── page.tsx  # Edit product form
    │       └── orders/
    │           ├── page.tsx      # Order list with status filter
    │           └── [id]/
    │               └── page.tsx  # Order detail + status update + tracking
    │
    ├── components/
    │   ├── ui/                   # Reusable presentational components (Button, Card, etc.)
    │   ├── layout/               # Header, Footer, Navigation, AdminSidebar
    │   ├── catalog/              # ProductCard, ProductGrid, FilterBar, SearchBox
    │   ├── product/              # ImageGallery, ConditionBadge, StockStatus
    │   ├── cart/                 # CartItemRow, CartSummary, UnavailableItemsSection
    │   ├── checkout/             # OrderSummary, CheckoutButton
    │   ├── order/                # OrderTimeline, TrackingInfo
    │   ├── admin/                # ProductForm, OrderStatusUpdate, ImageUpload
    │   └── feedback/             # Toast, LoadingSpinner, EmptyState, ErrorBanner
    │
    ├── lib/
    │   ├── db.ts                 # Database client singleton
    │   ├── stripe.ts             # Stripe client singleton
    │   ├── email.ts              # Email sending (Resend / SendGrid)
    │   ├── image-upload.ts       # Vercel Blob / Cloudinary upload helper
    │   ├── order-number.ts       # Human-readable order number generator
    │   ├── cart-utils.ts         # Cart parsing, validation, merging
    │   ├── product-utils.ts      # Stock checks, condition display names
    │   └── auth.ts               # Admin authentication utilities
    │
    ├── types/
    │   ├── product.ts            # Product-related TypeScript types
    │   ├── order.ts              # Order-related TypeScript types
    │   └── cart.ts               # Cart item and session types
    │
    ├── actions/
    │   ├── products.ts           # Server Actions: create, update, archive, fetch products
    │   ├── orders.ts             # Server Actions: update order status, add tracking
    │   └── cart.ts               # Server Actions: cart mutations (if needed)
    │
    ├── validations/
    │   ├── product.ts            # Zod schemas for product form input
    │   ├── order.ts              # Zod schemas for order status updates
    │   └── checkout.ts           # Zod schemas for checkout session creation
    │
    ├── styles/
    │   └── globals.css           # Tailwind imports + custom CSS variables
    │
    ├── hooks/                    # Custom React hooks
    │   ├── use-cart.ts           # Shopping cart state management (localStorage + sync)
    │   ├── use-stock-check.ts    # Real-time stock validation for cart items
    │   └── use-order-tracking.ts # Poll-based or SSE-based order status updates
    │
    └── emails/
        ├── templates/
        │   ├── order-confirmation.tsx  # Confirmation email template
        │   └── shipping-notification.tsx  # Shipping email template (post-MVP)
        └── index.ts                    # Email dispatch function
```

## Directory Rationales

### `db/`
Database-first source of truth. `schema.ts` contains Drizzle ORM table definitions that map one-to-one with the PostgreSQL migration files. The Drizzle client is exported from `db/index.ts` and imported wherever queries are needed.

### `src/app/`
Next.js App Router file-based routing. Server Components by default; Client Components marked with `"use client"` at the top. Each public route corresponds to a user story in the PRD. The `/api/` namespace holds webhook and lookup endpoints. The `/admin/` namespace is protected by route-level auth middleware.

### `src/components/`
Organized by feature domain. `ui/` holds low-level building blocks (buttons, inputs, cards). Feature directories (`catalog/`, `product/`, `cart/`) compose those primitives into domain-specific UI. Shared structural elements go in `layout/`. User feedback patterns go in `feedback/`.

### `src/lib/`
Singleton configurations and utility functions. Each file wraps an external dependency (database, Stripe, email) with environment variable injection and provides typed helper functions. This layer isolates infrastructure from application logic.

### `src/types/`
TypeScript type definitions that mirror the database schema but are decoupled from Drizzle types. These are used across components, actions, and API routes. They represent the domain model, not the persistence layer.

### `src/actions/`
Next.js Server Actions for form submissions and mutations. These handle server-side validation (via Zod), database operations, and error handling. Used by admin CRUD forms and any mutation that does not need a traditional API route.

### `src/validations/`
Zod schemas for every form and API input boundary. These are the single source of truth for input validation and are shared between Server Actions, API routes, and client-side form validation.

### `src/hooks/`
Custom React hooks that encapsulate client-side state logic. The cart hook manages localStorage persistence and cart synchronization. The stock-check hook validates cart items against current inventory.

### `src/emails/`
Transactional email templates built with React (Resend / @react-email). Each template is a standalone component that receives order data and renders HTML. The index module provides a send function that handles delivery tracking and error logging.

## Data Flow

### Add to Cart
1. User clicks "Add to Cart" on a product detail page (Client Component).
2. `useCart` hook writes the item to `localStorage` and updates the cart count header.
3. When viewing the cart, each item is validated against the current stock level via a server query.
4. If stock has changed, the UI clamps the quantity and shows an inline message.

### Checkout
1. User clicks "Proceed to Checkout."
2. A `POST` request to `/checkout` validates cart inventory atomically.
3. A Stripe Checkout session is created with line items, flat shipping, and totals.
4. User is redirected to Stripe's hosted checkout page.
5. On success, Stripe redirects to `/order-confirmation`.
6. Stripe simultaneously sends `checkout.session.completed` to `/api/webhooks/stripe`.

### Webhook → Order Creation
1. Stripe sends `checkout.session.completed` to `/api/webhooks/stripe`.
2. The webhook handler verifies the signature and checks idempotency (existing order with same `stripe_session_id`).
3. If new, it inserts the `orders` record and `order_items` records in a single transaction.
4. It sends a confirmation email and logs the event.
5. The handler returns 200 in all cases to acknowledge receipt.

### Admin Product CRUD
1. Admin authenticates via `/admin/login` (password from `ADMIN_PASSWORD` env var).
2. The "Add Product" form collects all fields + image uploads.
3. Images are uploaded to Vercel Blob Storage before form submission returns URLs.
4. The Server Action validates input with Zod, then inserts into `products` and `product_images`.
5. The product appears in the public catalog on the next load (no caching delay).
6. Updates increment the `version` column for optimistic concurrency control.

## Order State Machine

```
pending → processing → shipped → delivered
            |
            └──→ cancelled
```

Valid transitions:
- `pending` → `processing` (payment captured via webhook)
- `pending` → `cancelled` (payment failed or refunded)
- `processing` → `shipped` (admin marks as shipped with tracking)
- `processing` → `cancelled` (order issue, refund issued)
- `shipped` → `delivered` (admin confirms delivery)

Invalid transitions (e.g., `pending` → `shipped`, `cancelled` → `processing`) are rejected with an error.
