"use client";

import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle, Loader2, X } from "lucide-react";
import type {
  DiscogsImportSummary,
} from "@/lib/discogs-import";

const INVENTORY_REQUIRED_COLUMNS = [
  "listing_id",
  "artist",
  "title",
  "format",
  "release_id",
  "status",
  "price",
] as const;
const COLLECTION_REQUIRED_COLUMNS = [
  "artist",
  "title",
  "release_id",
  "collection media condition",
] as const;

function detectCsvType(headers: string[]): "inventory" | "collection" | "unknown" {
  const normalized = headers.map((header) => header.toLowerCase().trim());
  if (normalized.includes("collection media condition")) return "collection";
  if (normalized.includes("listing_id")) return "inventory";
  return "unknown";
}

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

  if (headers.length === 0 && currentField) headers.push(currentField);
  if (headers.length > 0) headers[0] = headers[0].replace(/^\uFEFF/, "");
  return headers.map((header) => header.trim()).filter(Boolean);
}

type ImportState =
  | { phase: "idle" }
  | {
      phase: "importing";
      jobId: string;
      processed: number;
      total: number;
      current: string;
      csvType: "inventory" | "collection";
      destination: "active" | "archived";
    }
  | {
      phase: "done";
      destination: "active" | "archived";
      summary: DiscogsImportSummary;
      csvType: "inventory" | "collection";
    }
  | { phase: "error"; message: string };

type ImportJobStatusResponse = {
  id: string;
  csvType: "inventory" | "collection";
  destination: "active" | "archived";
  status: "queued" | "running" | "completed" | "failed";
  processedRows: number;
  totalRows: number;
  currentItem: string | null;
  summary: DiscogsImportSummary | null;
  error: string | null;
};

export function ImportCatalogForm() {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importState, setImportState] = useState<ImportState>({ phase: "idle" });
  const [destination, setDestination] = useState<"auto" | "active" | "archived">("auto");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const detectedType = detectCsvType(previewHeaders);
  const effectiveDestination: "active" | "archived" =
    destination !== "auto"
      ? destination
      : detectedType === "collection"
        ? "archived"
        : "active";
  const destinationSummary =
    effectiveDestination === "archived"
      ? "Inventory = collection, not on sale."
      : "Catalog = directly on sale.";

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreviewError(null);
    setDestination("auto");

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

  useEffect(() => {
    if (importState.phase !== "importing") {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/admin/import/${importState.jobId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not read import progress.");
        }

        const job = (await response.json()) as ImportJobStatusResponse;
        if (cancelled) {
          return;
        }

        if (job.status === "completed" && job.summary) {
          setImportState({
            phase: "done",
            summary: job.summary,
            csvType: job.csvType,
            destination: job.destination,
          });
          return;
        }

        if (job.status === "failed") {
          setImportState({
            phase: "error",
            message: job.error ?? "Import failed unexpectedly.",
          });
          return;
        }

        setImportState((previous) => {
          if (previous.phase !== "importing" || previous.jobId !== job.id) {
            return previous;
          }

          return {
            ...previous,
            processed: job.processedRows,
            total: job.totalRows,
            current:
              job.currentItem ??
              (job.status === "queued" ? "Queued in background..." : "Preparing import..."),
          };
        });
      } catch (error) {
        if (!cancelled) {
          setImportState({
            phase: "error",
            message: error instanceof Error ? error.message : "Could not track import progress.",
          });
        }
      }
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [importState]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("csvFile") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("csvFile", file);
      formData.append("destination", effectiveDestination);

      const response = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Import request failed." }));
        setImportState({
          phase: "error",
          message: (body as { error?: string }).error ?? "Import failed.",
        });
        return;
      }

      const body = (await response.json()) as {
        jobId: string;
        csvType: "inventory" | "collection";
        destination: "active" | "archived";
        totalRows: number;
      };

      setImportState({
        phase: "importing",
        jobId: body.jobId,
        processed: 0,
        total: body.totalRows,
        current: "Queued in background...",
        csvType: body.csvType,
        destination: body.destination,
      });
    } catch (error) {
      setImportState({
        phase: "error",
        message: (error as Error).message ?? "Unexpected error.",
      });
    }
  }

  function resetForm() {
    setImportState({ phase: "idle" });
    setSelectedFileName(null);
    setPreviewHeaders([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isImporting = importState.phase === "importing";
  const progress =
    isImporting && importState.total > 0
      ? Math.round((importState.processed / importState.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CSV import</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">
            {destinationSummary}
          </p>
        </div>
        <Link href="/admin/products" className="btn-secondary shrink-0">
          Back to products
        </Link>
      </div>

      {(importState.phase === "idle" || importState.phase === "error") && (
        <form onSubmit={(event) => void handleSubmit(event)} className="card space-y-4">
          {importState.phase === "error" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-danger">
              {importState.message}
            </div>
          )}

          <div>
            <label htmlFor="csvFile" className="label">
              CSV file
            </label>
            <input
              id="csvFile"
              name="csvFile"
              type="file"
              accept=".csv,text/csv"
              className="input"
              ref={fileInputRef}
              onChange={(event) => void handleFileChange(event)}
              required
            />
            {selectedFileName && (
              <p className="mt-2 text-xs text-muted">Selected: {selectedFileName}</p>
            )}
          </div>

          {(previewHeaders.length > 0 || previewError) && (
            <div className="rounded-[1.5rem] border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Column scan</h2>
                  <p className="mt-1 text-xs text-muted">
                    Browser preview - the server re-validates before importing.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    {previewHeaders.length} columns
                  </p>
                  {detectedType !== "unknown" && (
                    <p
                      className={`mt-0.5 text-xs font-semibold ${
                        detectedType === "collection"
                          ? "text-blue-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {detectedType === "collection"
                        ? "Collection file - goes to Inventory (not for sale)"
                        : "Catalog file - goes live in catalog immediately"}
                    </p>
                  )}
                </div>
              </div>

              {previewError ? (
                <p className="mt-3 text-sm text-danger">{previewError}</p>
              ) : (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {previewHeaders.map((header) => (
                      <span
                        key={header}
                        className="rounded-full border border-border px-3 py-1 text-xs text-muted"
                      >
                        {header}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {(detectedType === "collection"
                      ? COLLECTION_REQUIRED_COLUMNS
                      : INVENTORY_REQUIRED_COLUMNS
                    ).map((column) => {
                      const found = previewHeaders.some(
                        (header) => header.toLowerCase().trim() === column.toLowerCase()
                      );
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

          <div className="rounded-[1.5rem] border border-border bg-white p-4 text-sm text-muted">
            <p className="font-semibold text-foreground">Import rules</p>
            <p className="mt-2">Inventory = collection, not on sale.</p>
            <p className="mt-1">Catalog = directly on sale.</p>
            <p className="mt-2">
              Pick the destination below if you want to override the file type.
            </p>
          </div>

          <div className="rounded-[1.5rem] border-2 border-accent/20 bg-accent/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">
              Where should these items go?
            </p>
            <div className="flex flex-col gap-2">
              {([
                {
                  value: "archived" as const,
                  label: "Inventory only - not for sale",
                  desc: "Items land in the Inventory page. Set prices and publish individually.",
                  recommended: detectedType === "collection",
                },
                {
                  value: "active" as const,
                  label: "Catalog - live on sale immediately",
                  desc: "Items go live in the public catalog straight away.",
                  recommended: detectedType === "inventory",
                },
              ] as const).map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    effectiveDestination === option.value
                      ? "border-accent bg-white"
                      : "border-border bg-surface hover:border-foreground/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="destinationChoice"
                    value={option.value}
                    checked={effectiveDestination === option.value}
                    onChange={() => setDestination(option.value)}
                    className="mt-0.5 h-4 w-4 text-accent"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {option.label}
                      {option.recommended && detectedType !== "unknown" && (
                        <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          recommended
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              {effectiveDestination === "archived"
                ? "Import to inventory"
                : "Import to catalog"}
            </button>
          </div>
        </form>
      )}

      {isImporting && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Importing {importState.csvType === "collection" ? "collection" : "catalog"}...
                </p>
                <p className="mt-0.5 max-w-xs truncate text-xs text-muted">
                  {importState.current}
                </p>
              </div>
            </div>
            <span className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Background job
            </span>
          </div>

          {importState.total > 0 && (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted">
                {importState.processed} / {importState.total} items processed ({progress}%)
              </p>
            </>
          )}

          <p className="text-xs text-muted">
            This import keeps running in the background even if you leave or close the tab.
          </p>
        </div>
      )}

      {importState.phase === "done" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 shrink-0 text-success" />
                <div>
                  <h2 className="text-lg font-bold text-foreground">Import complete</h2>
                  <p className="text-sm text-muted">
                    {importState.destination === "archived"
                      ? "Items were added to Inventory. Set prices and publish them when ready."
                      : "Imported items are now live in the public catalog."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Close"
                className="text-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Rows scanned", value: importState.summary.totalRows },
                { label: "Imported", value: importState.summary.imported },
                { label: "With images", value: importState.summary.rowsWithImages },
                { label: "No images", value: importState.summary.rowsWithoutImages },
                { label: "Auto-archived", value: importState.summary.archived },
                { label: "Active rows", value: importState.summary.activeRows },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-background p-3 text-center"
                >
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-muted">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={resetForm} className="btn-secondary">
                Import another file
              </button>
              {importState.destination === "archived" ? (
                <Link href="/admin/inventory" className="btn-primary">
                  Go to Inventory
                </Link>
              ) : (
                <Link href="/admin/products" className="btn-primary">
                  Go to Products
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
