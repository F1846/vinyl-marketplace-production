import type { ProductFormat } from "@/types/product";
import { buildCatalogPath, siteUrl } from "@/lib/site";

type CollectionQuery = {
  format?: ProductFormat;
  genre?: string;
};

type BaseSeoLandingPage = {
  slug: string;
  eyebrow: string;
  title: string;
  heading: string;
  description: string;
  intro: string;
  body: string;
  keywords: string[];
  ctaLabel: string;
  ctaHref: string;
  supportingLinks: Array<{ label: string; href: string }>;
};

export type CollectionSeoLandingPage = BaseSeoLandingPage & {
  kind: "collection";
  query: CollectionQuery;
  collectionLabel: string;
  productHeading: string;
};

export type PickupSeoLandingPage = BaseSeoLandingPage & {
  kind: "pickup";
  productHeading: string;
  faqs: Array<{ question: string; answer: string }>;
};

export type SeoLandingPage = CollectionSeoLandingPage | PickupSeoLandingPage;

export const seoLandingPages: SeoLandingPage[] = [
  {
    slug: "techno-vinyl",
    kind: "collection",
    eyebrow: "Techno collection",
    title: "Techno Vinyl | Federico Shop Berlin",
    heading: "Techno vinyl picked for collectors.",
    description:
      "Shop techno vinyl from Federico Shop, the Berlin electronic music record shop for graded used records, fair euro pricing, and collector-minded shipping.",
    intro:
      "This page focuses on techno vinyl from the Federico Shop racks, with graded condition notes and direct links into the live catalog.",
    body:
      "If you are searching for techno vinyl online from a Berlin record shop, this is the cleanest starting point: current stock, clear grading, and checkout with card, PayPal, or local pickup.",
    keywords: [
      "techno vinyl",
      "techno records berlin",
      "berlin techno record shop",
      "used techno vinyl",
      "Federico Shop techno",
    ],
    ctaLabel: "Browse all techno vinyl",
    ctaHref: buildCatalogPath({ genre: "Techno", format: "vinyl" }),
    supportingLinks: [
      { label: "Darkwave records", href: siteUrl("/darkwave-records") },
      { label: "EBM records", href: siteUrl("/ebm-records") },
      { label: "Berlin local pickup", href: siteUrl("/berlin-local-pickup") },
    ],
    query: { genre: "Techno", format: "vinyl" },
    collectionLabel: "Techno vinyl",
    productHeading: "Current techno vinyl in stock",
  },
  {
    slug: "darkwave-records",
    kind: "collection",
    eyebrow: "Darkwave collection",
    title: "Darkwave Records | Federico Shop Berlin",
    heading: "Darkwave records with clear grading and stock.",
    description:
      "Explore darkwave records from Federico Shop, including graded vinyl, cassette, and CD listings from a Berlin electronic music record shop.",
    intro:
      "This landing page gathers darkwave records from the live Federico Shop catalog so visitors and search engines can reach the section directly.",
    body:
      "Each listing includes current stock, euro pricing, and condition notes, making it easier to browse darkwave collector copies without digging through the full archive first.",
    keywords: [
      "darkwave records",
      "darkwave vinyl",
      "darkwave cds",
      "berlin darkwave records",
      "Federico Shop darkwave",
    ],
    ctaLabel: "Browse all darkwave records",
    ctaHref: buildCatalogPath({ genre: "Darkwave" }),
    supportingLinks: [
      { label: "Techno vinyl", href: siteUrl("/techno-vinyl") },
      { label: "EBM records", href: siteUrl("/ebm-records") },
      { label: "Ambient records", href: siteUrl("/ambient-records") },
    ],
    query: { genre: "Darkwave" },
    collectionLabel: "Darkwave records",
    productHeading: "Darkwave picks from the catalog",
  },
  {
    slug: "ebm-records",
    kind: "collection",
    eyebrow: "EBM collection",
    title: "EBM Records | Federico Shop Berlin",
    heading: "EBM records from the Federico Shop shelves.",
    description:
      "Browse EBM records and related electronic body music releases from Federico Shop in Berlin, with graded copies and collector-friendly order flow.",
    intro:
      "This page gives EBM searches a dedicated landing page instead of dropping visitors onto a generic catalog view.",
    body:
      "Use it to jump straight into EBM stock, then move into the full archive if you want broader darkwave, electro, or industrial-adjacent picks.",
    keywords: [
      "EBM records",
      "EBM vinyl",
      "electronic body music records",
      "berlin EBM record shop",
      "Federico Shop EBM",
    ],
    ctaLabel: "Browse all EBM records",
    ctaHref: buildCatalogPath({ genre: "EBM" }),
    supportingLinks: [
      { label: "Darkwave records", href: siteUrl("/darkwave-records") },
      { label: "Electro vinyl", href: siteUrl("/electro-vinyl") },
      { label: "Track your order", href: siteUrl("/track-order") },
    ],
    query: { genre: "EBM" },
    collectionLabel: "EBM records",
    productHeading: "EBM releases available now",
  },
  {
    slug: "electro-vinyl",
    kind: "collection",
    eyebrow: "Electro collection",
    title: "Electro Vinyl | Federico Shop Berlin",
    heading: "Electro vinyl ready to pull from the racks.",
    description:
      "Find electro vinyl from Federico Shop, the Berlin electronic music record shop with graded used records, fair euro pricing, and responsive shipping.",
    intro:
      "This page is built as a direct search landing page for electro vinyl, with a tighter focus than the general catalog and quick links into nearby styles.",
    body:
      "If you search for electro vinyl online, this page should get you to active stock fast, then let you widen the search into EBM, techno, and other electronic sections.",
    keywords: [
      "electro vinyl",
      "electro records berlin",
      "berlin electro vinyl shop",
      "used electro records",
      "Federico Shop electro",
    ],
    ctaLabel: "Browse all electro vinyl",
    ctaHref: buildCatalogPath({ genre: "Electro", format: "vinyl" }),
    supportingLinks: [
      { label: "Techno vinyl", href: siteUrl("/techno-vinyl") },
      { label: "EBM records", href: siteUrl("/ebm-records") },
      { label: "Catalog", href: siteUrl("/catalog") },
    ],
    query: { genre: "Electro", format: "vinyl" },
    collectionLabel: "Electro vinyl",
    productHeading: "Electro vinyl currently listed",
  },
  {
    slug: "ambient-records",
    kind: "collection",
    eyebrow: "Ambient collection",
    title: "Ambient Records | Federico Shop Berlin",
    heading: "Ambient records with condition notes and real stock.",
    description:
      "Browse ambient records from Federico Shop, including graded vinyl, cassette, and CD listings from a Berlin-based electronic music record shop.",
    intro:
      "Ambient searches deserve a calmer landing page too, with live product links and a clearer path than dropping into the full store with no context.",
    body:
      "This page helps ambient and experimental listeners land directly on the right part of the catalog, then branch out into the rest of the electronic music archive.",
    keywords: [
      "ambient records",
      "ambient vinyl",
      "ambient cds",
      "berlin ambient records",
      "Federico Shop ambient",
    ],
    ctaLabel: "Browse all ambient records",
    ctaHref: buildCatalogPath({ genre: "Ambient" }),
    supportingLinks: [
      { label: "Electro vinyl", href: siteUrl("/electro-vinyl") },
      { label: "Techno vinyl", href: siteUrl("/techno-vinyl") },
      { label: "Shipping and pickup", href: siteUrl("/shipping") },
    ],
    query: { genre: "Ambient" },
    collectionLabel: "Ambient records",
    productHeading: "Ambient picks from the live shop",
  },
  {
    slug: "berlin-local-pickup",
    kind: "pickup",
    eyebrow: "Berlin pickup",
    title: "Berlin Local Pickup | Federico Shop",
    heading: "Berlin local pickup for Federico Shop orders.",
    description:
      "Reserve records online and collect them in Berlin Neukolln with Federico Shop local pickup. Use card, PayPal, or pickup reservation at checkout.",
    intro:
      "This page is a dedicated entry point for Berlin local pickup searches, with the pickup area, checkout details, and live product shelf all in one place.",
    body:
      "If you are in Berlin and want to avoid shipping, you can place the order online, choose local pickup, and receive the follow-up confirmation by email before collection.",
    keywords: [
      "Berlin local pickup records",
      "Berlin record shop pickup",
      "Federico Shop pickup",
      "Neukolln record pickup",
      "buy records online Berlin pickup",
    ],
    ctaLabel: "See pickup-friendly stock",
    ctaHref: buildCatalogPath(),
    supportingLinks: [
      { label: "Shipping and pickup", href: siteUrl("/shipping") },
      { label: "Contact Federico Shop", href: siteUrl("/contact") },
      { label: "Track your order", href: siteUrl("/track-order") },
    ],
    productHeading: "Records available for Berlin pickup",
    faqs: [
      {
        question: "Where is Federico Shop local pickup?",
        answer: "Pickup is arranged in Berlin Neukolln at Federico Shop after you place the order and receive the confirmation email.",
      },
      {
        question: "How do I choose local pickup?",
        answer: "Add records to the cart, complete the checkout details, and choose the local pickup option before placing the order.",
      },
      {
        question: "When do I get pickup details?",
        answer: "After the order is received, Federico Shop sends a confirmation email with the pickup confirmation and details.",
      },
    ],
  },
];

export const seoLandingPageSlugs = seoLandingPages.map((page) => ({ slug: page.slug }));

export const seoLandingPagesBySlug = new Map(
  seoLandingPages.map((page) => [page.slug, page] as const),
);

export function getSeoLandingPage(slug: string) {
  return seoLandingPagesBySlug.get(slug);
}
