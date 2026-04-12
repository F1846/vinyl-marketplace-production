import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalogMetadata, getCatalogSeoMeta } from "./catalog-seo";

test("catalog search URLs are noindex and canonicalize to the filtered catalog", () => {
  const metadata = buildCatalogMetadata({
    q: "dopplereffekt",
    format: "vinyl",
    genre: [],
    sort: "newest",
  });

  assert.equal(metadata.robots?.index, false);
  assert.equal(metadata.alternates?.canonical, "https://www.federicoshop.de/catalog?format=vinyl");
});

test("custom sort URLs are noindex and canonicalize to the base collection", () => {
  const metadata = buildCatalogMetadata({
    q: "",
    format: "vinyl",
    genre: ["Techno"],
    sort: "price-desc",
  });

  assert.equal(metadata.robots?.index, false);
  assert.equal(
    metadata.alternates?.canonical,
    "https://www.federicoshop.de/catalog?format=vinyl&genre=Techno",
  );
});

test("indexable catalog collections keep their canonical URL", () => {
  const seo = getCatalogSeoMeta({
    q: "",
    format: "cassette",
    genre: ["EBM"],
    sort: "newest",
  });

  assert.equal(seo.indexable, true);
  assert.equal(
    seo.canonical,
    "https://www.federicoshop.de/catalog?format=cassette&genre=EBM",
  );
});
