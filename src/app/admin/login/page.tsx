"use client";

import { useActionState } from "react";
import { adminLoginAction } from "@/actions/auth";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [state, formAction] = useActionState(
    adminLoginAction,
    { error: null, success: false }
  );

  if (state.success) {
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-20 max-w-md">
      <div className="card space-y-6">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <Lock className="h-6 w-6 text-accent" />
          </div>
        </div>
        <h1 className="text-center text-xl font-bold text-foreground">Admin Login</h1>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder="Enter admin password"
              autoFocus
              required
            />
          </div>
          {state.error && (
            <p className="text-sm text-danger">{state.error}</p>
          )}
          <button type="submit" className="btn-primary w-full">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
