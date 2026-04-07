// Seed data: 10 electronic music releases
// Run with: npx tsx db/seed.ts (requires DATABASE_URL set)

import "dotenv/config";
import { db } from "./index.js";
import { products, productImages } from "./schema";

const seedProducts = [
  {
    artist: "Aphex Twin",
    title: "Selected Ambient Works 85-92",
    format: "vinyl" as const,
    genre: "Ambient",
    priceCents: 3200,
    stockQuantity: 3,
    conditionMedia: "VG+" as const,
    conditionSleeve: "VG" as const,
    pressingLabel: "R&S Records",
    pressingYear: 1992,
    pressingCatalogNumber: "RS 92009",
    description: "Classic ambient techno album. Double LP, original R&S pressing.",
  },
  {
    artist: "Jeff Mills",
    title: "Waveform Transmission Vol. 1",
    format: "vinyl" as const,
    genre: "Techno",
    priceCents: 2800,
    stockQuantity: 1,
    conditionMedia: "NM" as const,
    conditionSleeve: "NM" as const,
    pressingLabel: "Tresor",
    pressingYear: 1993,
    pressingCatalogNumber: "TRESOR 18",
    description: "Detroit techno on the legendary Tresor label. Original pressing.",
  },
  {
    artist: "Daft Punk",
    title: "Homework",
    format: "vinyl" as const,
    genre: "House",
    priceCents: 3500,
    stockQuantity: 2,
    conditionMedia: "VG+" as const,
    conditionSleeve: "VG+" as const,
    pressingLabel: "Virgin",
    pressingYear: 1997,
    pressingCatalogNumber: "8454629",
    description: "Debut album, 4xLP. Includes Around The World, Da Funk.",
  },
  {
    artist: "Autechre",
    title: "Tri Repetae",
    format: "cd" as const,
    genre: "IDM",
    priceCents: 1800,
    stockQuantity: 4,
    conditionMedia: "NM" as const,
    conditionSleeve: null,
    pressingLabel: "Warp",
    pressingYear: 1995,
    pressingCatalogNumber: "WARP 36 CD",
    description: "Original Warp CD pressing. Classic IDM.",
  },
  {
    artist: "Orbital",
    title: "Orbital (Brown Album)",
    format: "cassette" as const,
    genre: "Techno",
    priceCents: 1500,
    stockQuantity: 2,
    conditionMedia: "VG" as const,
    conditionSleeve: null,
    pressingLabel: "FFRR",
    pressingYear: 1993,
    pressingCatalogNumber: "FFRR C 002",
    description: "Rare cassette pressing. Plays great, some case wear.",
  },
  {
    artist: "The Future Sound of London",
    title: "Lifeforms",
    format: "vinyl" as const,
    genre: "Ambient",
    priceCents: 4000,
    stockQuantity: 1,
    conditionMedia: "VG" as const,
    conditionSleeve: "G" as const,
    pressingLabel: "Virgin",
    pressingYear: 1994,
    pressingCatalogNumber: "V 2500",
    description: "Ambient classic. 4xLP on Virgin. Some sleeve wear, vinyl plays clean.",
  },
  {
    artist: "LTJ Bukem",
    title: "Logical Progression",
    format: "vinyl" as const,
    genre: "Drum & Bass",
    priceCents: 2200,
    stockQuantity: 1,
    conditionMedia: "VG+" as const,
    conditionSleeve: "M" as const,
    pressingLabel: "FFRR",
    pressingYear: 1996,
    pressingCatalogNumber: "FFRR 024",
    description: "Seminal drum & bass. Double LP compilation.",
  },
  {
    artist: "Boards of Canada",
    title: "Music Has the Right to Children",
    format: "vinyl" as const,
    genre: "IDM",
    priceCents: 4500,
    stockQuantity: 0,
    conditionMedia: "NM" as const,
    conditionSleeve: "NM" as const,
    pressingLabel: "Warp/Skam",
    pressingYear: 1998,
    pressingCatalogNumber: "WARP LP 60",
    description: "Original Warp pressing. Mint condition. Sold out on Discogs!",
  },
  {
    artist: "Plastikman",
    title: "Sheet One",
    format: "vinyl" as const,
    genre: "Techno",
    priceCents: 5000,
    stockQuantity: 1,
    conditionMedia: "VG+" as const,
    conditionSleeve: "VG" as const,
    pressingLabel: "Plus 8",
    pressingYear: 1994,
    pressingCatalogNumber: "PK8001",
    description: "Richie Hawtin ambient techno project. Original Plus 8 pressing. Collectible.",
  },
  {
    artist: "Underworld",
    title: "Dubnobasswithmyheadman",
    format: "cd" as const,
    genre: "Techno",
    priceCents: 1200,
    stockQuantity: 5,
    conditionMedia: "VG+" as const,
    conditionSleeve: null,
    pressingLabel: "Junior Boy's Own",
    pressingYear: 1994,
    pressingCatalogNumber: "JBO CD 2",
    description: "Classic progressive house/techno. Original CD pressing with booklet.",
  },
];

async function main() {
  const d = db();

  console.log("Seeding products...");

  for (const product of seedProducts) {
    const [inserted] = await d
      .insert(products)
      .values({
        id: crypto.randomUUID(),
        ...product,
      })
      .returning();

    await d.insert(productImages).values({
      id: crypto.randomUUID(),
      productId: inserted.id,
      url: "", // Will be filled when images are uploaded
      sortOrder: 0,
    });

    console.log(`  Added: ${product.artist} - ${product.title}`);
  }

  console.log("Done! Seeded 10 products.");
}

main().catch(console.error);
