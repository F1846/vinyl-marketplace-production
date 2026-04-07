import { formatEuroFromCents } from "@/lib/money";

export function formatPrice(cents: number): string {
  return formatEuroFromCents(cents);
}

export function formatCondition(grade: string | null): string {
  if (!grade) return "Not graded";
  const labels: Record<string, string> = {
    M: "Mint",
    NM: "Near Mint",
    "VG+": "Very Good Plus",
    VG: "Very Good",
    G: "Good",
    P: "Poor",
  };
  return labels[grade] || grade;
}

export function formatFormatBadgeClass(format: string): string {
  const classes: Record<string, string> = {
    vinyl: "badge-vinyl",
    cassette: "badge-cassette",
    cd: "badge-cd",
  };
  return classes[format] || "badge";
}
