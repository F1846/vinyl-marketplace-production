import { requireAuthenticatedAdmin } from "@/lib/auth";
import { NewProductForm } from "./new-product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAuthenticatedAdmin();
  return <NewProductForm />;
}
