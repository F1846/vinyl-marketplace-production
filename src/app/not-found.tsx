import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-6xl font-bold text-accent">404</h1>
      <p className="mt-4 text-lg text-muted">Product not found</p>
      <Link href="/catalog" className="btn-primary mt-6 inline-flex">
        <ArrowLeft className="h-4 w-4" /> Back to Catalog
      </Link>
    </div>
  );
}
