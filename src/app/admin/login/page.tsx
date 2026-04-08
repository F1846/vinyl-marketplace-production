import { isAuthenticatedAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAuthenticatedAdmin()) {
    redirect("/admin");
  }

  return <AdminLoginForm />;
}
