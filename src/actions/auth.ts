"use server";

import { clearAdminSession, createAdminSession, verifyAdminPassword } from "@/lib/auth";
import { rateLimitAdminLogin } from "@/lib/admin-rate-limit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

const GENERIC_AUTH_ERROR = "Invalid credentials. Please try again.";

export async function adminLoginAction(
  _prevState: { error: string | null; success: boolean },
  formData: FormData
): Promise<{ error: string | null; success: boolean }> {
  // Rate-limit by IP: 5 attempts per 15 minutes
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "unknown";

  const rateLimit = await rateLimitAdminLogin(ip);
  if (!rateLimit.success) {
    return {
      error: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      success: false,
    };
  }

  const password = formData.get("password") as string;

  if (!password) {
    return { error: GENERIC_AUTH_ERROR, success: false };
  }

  const isValid = await verifyAdminPassword(password);

  if (!isValid) {
    // Constant-time delay to slow brute-force even after rate-limit window resets
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { error: GENERIC_AUTH_ERROR, success: false };
  }

  await createAdminSession();
  revalidatePath("/admin");
  redirect("/admin");
  return { error: null, success: true };
}

export async function adminLogoutAction(): Promise<void> {
  await clearAdminSession();
  revalidatePath("/admin");
  redirect("/admin/login");
}
