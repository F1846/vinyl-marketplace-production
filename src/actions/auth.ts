"use server";

import { verifyAdminPassword, createAdminSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function adminLoginAction(
  prevState: { error: string | null; success: boolean },
  formData: FormData
): Promise<{ error: string | null; success: boolean }> {
  const password = formData.get("password") as string;

  if (!password) {
    return { error: "Password is required", success: false };
  }

  const isValid = await verifyAdminPassword(password);

  if (!isValid) {
    return { error: "Invalid password", success: false };
  }

  await createAdminSession();
  revalidatePath("/admin");
  redirect("/admin");
  return { error: null, success: true };
}
