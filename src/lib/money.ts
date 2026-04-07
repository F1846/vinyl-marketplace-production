const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function formatEuroFromCents(cents: number): string {
  return euroFormatter.format(cents / 100);
}
