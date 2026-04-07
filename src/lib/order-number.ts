// Generates human-readable order numbers: VM-20260407-0001
export function generateOrderNumber(sequence: number): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `VM-${date}-${String(sequence).padStart(4, "0")}`;
}
