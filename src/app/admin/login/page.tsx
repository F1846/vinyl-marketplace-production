import { isAuthenticatedAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthenticatedAdmin()) {
    redirect("/admin");
  }

  const params = await searchParams;
  const error =
    params.error === "invalid-password"
      ? "Invalid password"
      : params.error === "missing-password"
        ? "Password is required"
        : params.error === "session-expired"
          ? "Your admin session expired after 15 minutes. Please sign in again."
          : params.error === "too-many-attempts"
            ? "Too many login attempts. Please wait a few minutes and try again."
        : params.error === "auth-not-configured"
          ? "Admin login is not configured"
          : null;

  return <AdminLoginForm error={error} />;
}
