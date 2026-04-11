# SEO Strategy

This repository already includes technical SEO foundations, but every real deployment must customize the brand, domain, and keyword set before launch.

## What Is Already Built In

- canonical metadata support
- `robots.txt`
- `sitemap.xml`
- product, catalog, and breadcrumb structured data
- Open Graph and Twitter image routes
- public informational pages that can carry SEO copy
- configurable brand aliases and keyword arrays in `src/lib/site.ts`

## First Customization Step

Before indexing a new store, replace the example SEO profile in:

- `src/lib/site.ts`
  - `name`
  - `description`
  - `tagline`
  - `brandAliases`
  - `seoKeywords`
  - `baseUrl`
- `src/lib/i18n/dictionaries.ts`
  - homepage, about, shipping, and legal copy

Do not rely on shipped example keywords for a real deployment.

## Launch Checklist

1. Set `NEXT_PUBLIC_SITE_URL` to your real production domain.
2. Add `GOOGLE_SITE_VERIFICATION`.
3. Verify the site in Google Search Console.
4. Submit:
   - `https://your-store.example/sitemap.xml`
5. Request indexing for:
   - homepage
   - catalog
   - about/contact pages
   - a sample of high-value product pages

## Product SEO Notes

Product pages should remain:

- unique in title and description
- clear in `Artist - Title` style naming
- honest about condition, format, label, year, and grading notes

For rich results, make sure product structured data keeps valid offer information in production.

## Content Strategy

- add fresh products consistently
- keep catalog descriptions specific instead of boilerplate
- create category depth around real genres and formats
- use internal links between home, catalog, format pages, and product pages

## Local Visibility

If your shop supports pickup:

- create and verify a Google Business Profile
- keep pickup city and postal data consistent across metadata, contact pages, and structured content

## Link Strategy

Use real links from places such as:

- Discogs seller profile
- Instagram bio
- Bandcamp / Linktree
- newsletters
- record-community directories
- interviews, mixes, or label pages you genuinely appear on

Avoid fake traffic, indexing bots, or low-quality backlink schemes.

## What to Monitor

- indexed pages
- Search Console impressions
- branded queries
- catalog landing pages
- product-page impressions
- favicon/snippet refresh after recrawl

## Repo-Level SEO Surfaces

When changing a store identity, review:

- `src/lib/site.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/catalog/page.tsx`
- `src/app/products/[id]/page.tsx`
- `src/app/manifest.ts`
- `public/logo-mark.svg`
