"use client";

import { ChangeEvent, useActionState, useState } from "react";
import Link from "next/link";
import { importCatalogCsvAction } from "@/actions/import";

const REQUIRED_COLUMNS = [
  "listing_id",
  "artist",
  "title",
  "format",
  "release_id",
  "status",
  "price",
] as const;

function parseCsvHeaders(input: string): string[] {
  const headers: string[] = [];
  let currentField = "";
  let inQuotes = false;

  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      headers.push(currentField);
      currentField = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      headers.push(currentField);
      break;
    }

    currentField += char;
  }

  if (headers.length === 0 && currentField) {
    headers.push(currentField);
  }

  if (headers.length > 0) {
    headers[0] = headers[0].replace(/^\uFEFF/, "");
  }

  return headers.map((header) => header.trim()).filter(Boolean);
}

export function ImportCatalogForm() {
  const [state, formAction] = useActionState(importCatalogCsvAction, {
    error: null,
    success: false,
    summary: null,
  });
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreviewError(null);

    if (!file) {
      setSelectedFileName(null);
      setPreviewHeaders([]);
      return;
    }

    setSelectedFileName(file.name);

    try {
      const text = await file.text();
      setPreviewHeaders(parseCsvHeaders(text));
    } catch {
      setPreviewHeaders([]);
      setPreviewError("The file could not be read in the browser preview.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bulk import catalog</h1>
          <p className="mt-2 text-sm text-muted">
            Upload a Discogs inventory CSV. The importer scans the columns,
            pulls cover art from Discogs, and syncs the active catalog.
          </p>
        </div>
        <Link href="/admin/products" className="btn-secondary">
          Back to products
        </Link>
      </div>

      <form action={formAction} className="card space-y-4">
        {state.error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-danger">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="csvFile" className="label">Discogs CSV file</label>
          <input
            id="csvFile"
            name="csvFile"
            type="file"
            accept=".csv,text/csv"
            className="input"
            onChange={(event) => void handleFileChange(event)}
            required
          />
          {selectedFileName && (
            <p className="mt-2 text-xs text-muted">Selected file: {selectedFileName}</p>
          )}
        </div>

        {(previewHeaders.length > 0 || previewError) && (
          <div className="rounded-[1.5rem] border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Column scan</h2>
                <p className="mt-1 text-xs text-muted">
                  This preview runs in the browser. The server will scan the file again before import.
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                {previewHeaders.length} detected
              </p>
            </div>

            {previewError ? (
              <p className="mt-3 text-sm text-danger">{previewError}</p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {previewHeaders.map((header) => (
                    <span key={header} className="rounded-full border border-border px-3 py-1 text-xs text-muted">
                      {header}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {REQUIRED_COLUMNS.map((column) => {
                    const found = previewHeaders.includes(column);

                    return (
                      <p key={column} className="text-sm text-muted">
                        {column}:{" "}
                        <span className={found ? "text-success" : "text-danger"}>
                          {found ? "found" : "missing"}
                        </span>
                      </p>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">
            Import catalog
          </button>
        </div>
      </form>

      {state.summary && (
        <div className="card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Import summary</h2>
            <p className="text-sm text-muted">
              The uploaded file was scanned and imported successfully.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Rows scanned</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{state.summary.totalRows}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Active rows</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{state.summary.activeRows}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Imported</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{state.summary.imported}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Detected columns</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {state.summary.headers.map((header) => (
                  <span key={header} className="rounded-full border border-border px-3 py-1 text-xs text-muted">
                    {header}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Required columns</h3>
              <div className="mt-3 space-y-2">
                {state.summary.requiredColumns.map((column) => (
                  <p key={column.name} className="text-sm text-muted">
                    {column.name}:{" "}
                    <span className={column.found ? "text-success" : "text-danger"}>
                      {column.found ? "found" : "missing"}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">With images</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{state.summary.rowsWithImages}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Without images</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{state.summary.rowsWithoutImages}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Archived</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{state.summary.archived}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
