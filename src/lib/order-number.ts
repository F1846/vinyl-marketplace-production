import { customAlphabet } from "nanoid";

const randomOrderCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

// Generates human-readable order numbers such as FS-20260408-A7K2
export function generateOrderNumber(): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `FS-${date}-${randomOrderCode()}`;
}
