import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { catalogSortValues, getCatalogPage } from "@/lib/catalog";

const catalogQuerySchema = z.object({
  q: z.string().trim().optional(),
  format: z.enum(["vinyl", "cassette", "cd"]).optional(),
  genre: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
  sort: z.enum(catalogSortValues).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
});

export async function GET(req: NextRequest) {
  const genres = req.nextUrl.searchParams.getAll("genre").filter(Boolean);

  const parsed = catalogQuerySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    format: req.nextUrl.searchParams.get("format") ?? undefined,
    genre:
      genres.length > 1
        ? genres
        : genres[0] ?? req.nextUrl.searchParams.get("genre") ?? undefined,
    sort: req.nextUrl.searchParams.get("sort") ?? undefined,
    offset: req.nextUrl.searchParams.get("offset") ?? undefined,
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const result = await getCatalogPage(parsed.data);

  return NextResponse.json(result);
}
