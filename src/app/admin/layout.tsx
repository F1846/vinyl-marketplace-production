import type { Metadata } from "next";
import type { ReactNode } from "react";
import { adminLogoutAction } from "@/actions/auth";
import { AdminSessionTimeout } from "@/components/admin/admin-session-timeout";
import { AdminNav } from "@/components/admin/admin-nav";
import { ADMIN_SESSION_TTL_SECONDS, isAuthenticatedAdmin } from "@/lib/auth";
import "./admin.css";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const isAuthed = await isAuthenticatedAdmin();

  if (!isAuthed) {
    return <div className="mx-auto w-full max-w-md">{children}</div>;
  }

  return (
    <div>
      <AdminSessionTimeout timeoutMs={ADMIN_SESSION_TTL_SECONDS * 1000} />
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <div className="flex flex-col md:flex-row">
          <AdminNav logoutAction={adminLogoutAction} />
          <div className="min-w-0 flex-1 px-4 md:pl-0 md:pr-5 lg:pr-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
