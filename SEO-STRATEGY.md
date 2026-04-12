# SEO Strategy

This repository ships with strong technical SEO foundations, but every real store still needs a custom brand, domain, and keyword profile before launch.

## What Is Already Built In

- canonical metadata support
- `robots.txt`
- `sitemap.xml`
- product, catalog, breadcrumb, website, and organization structured data
- Open Graph and Twitter image routes
- favicon and icon routes suitable for Search indexing
- public informational pages that can carry SEO copy
- configurable brand aliases and keyword arrays in `src/lib/site.ts`
- localized storefront copy that can target different language audiences

## First Customization Step

Before indexing a new store, replace the SEO profile in:

- `src/lib/site.ts`
  - `name`
  - `description`
  - `tagline`
  - `brandAliases`
  - `seoKeywords`
  - `baseUrl`
- `src/lib/i18n/dictionaries.ts`
  - homepage, about, shipping, and legal copy
- `public/logo-mark.svg`
  - brand mark used by icon generation and metadata assets

Do not rely on shipped example keywords for a real production launch.

## Launch Checklist

1. Set `NEXT_PUBLIC_SITE_URL` to the real production domain.
2. Add `GOOGLE_SITE_VERIFICATION`.
3. Verify the site in Google Search Console.
4. Submit:
   - `https://your-store.example/sitemap.xml`
5. Request indexing for:
   - homepage
   - catalog
   - about/contact pages
   - a sample of high-value product pages
6. Check that the favicon and logo asset resolve cleanly from public Googlebot access.

## Product SEO Notes

Product pages should remain:

- unique in title and description
- honest about condition, format, label, year, and grading
- complete enough for product structured data to stay valid

For rich results, keep valid `Offer` information in production:

- price
- currency
- stock / availability
- canonical product URL

If a product falls out of stock, the storefront and structured data should continue to reflect that state consistently.

## Catalog and Landing Strategy

This repo already supports:

- homepage discovery shelves
- catalog filters
- product pages
- optional landing-page slugs

Best practice:

- use the homepage for broad store intent
- use the catalog for format and genre discovery
- let product pages target artist, title, label, cat number, and condition intent
- only add landing pages that map to real search demand and real inventory depth

## Local Visibility

If your shop supports pickup:

- create and verify a Google Business Profile
- keep pickup city and postal data consistent across metadata, legal pages, and checkout copy
- use the same shop name, address, and phone format everywhere

## Link Strategy

Use real links from places such as:

- Discogs seller profile
- Instagram bio
- Bandcamp / Linktree
- newsletters
- record-community directories
- interviews, mixes, or label pages you genuinely appear on

Avoid fake traffic, low-quality backlink schemes, or indexing bots.

## What To Monitor

- indexed pages
- Search Console impressions
- branded queries
- catalog landing performance
- product-page impressions
- favicon refresh after recrawl
- rich-result eligibility for product pages

## Repo-Level SEO Surfaces

When changing a store identity, review:

- `src/lib/site.ts`
- `src/lib/i18n/dictionaries.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/catalog/page.tsx`
- `src/app/products/[id]/page.tsx`
- `src/app/[slug]/page.tsx`
- `src/app/manifest.ts`
- `src/app/favicon.ico/route.ts`
- `public/logo-mark.svg`
