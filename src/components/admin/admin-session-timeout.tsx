"use client";

import { useEffect, useRef } from "react";

export function AdminSessionTimeout({
  timeoutMs,
  expiresAtMs,
}: {
  timeoutMs: number;
  expiresAtMs: number | null;
}) {
  const timerRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    const deadlineMs = expiresAtMs ?? Date.now() + timeoutMs;

    async function logout() {
      if (loggingOutRef.current) {
        return;
      }

      loggingOutRef.current = true;

      try {
        await fetch("/api/admin/logout", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
      } catch {
        // Ignore network failures here and continue with the redirect.
      } finally {
        window.location.href = "/admin/login?error=session-expired";
      }
    }

    function clearTimer() {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    }

    function ensureLogoutAtDeadline() {
      const remainingMs = Math.max(deadlineMs - Date.now(), 0);
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        void logout();
      }, remainingMs);
    }

    function enforceIfExpired() {
      if (Date.now() >= deadlineMs) {
        void logout();
        return;
      }

      ensureLogoutAtDeadline();
    }

    ensureLogoutAtDeadline();
    document.addEventListener("visibilitychange", enforceIfExpired);
    window.addEventListener("focus", enforceIfExpired);

    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", enforceIfExpired);
      window.removeEventListener("focus", enforceIfExpired);
    };
  }, [expiresAtMs, timeoutMs]);

  return null;
}
