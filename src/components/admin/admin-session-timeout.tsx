"use client";

import { useEffect, useRef } from "react";

const SESSION_REFRESH_INTERVAL_MS = 60 * 1000;
const ACTIVITY_THROTTLE_MS = 750;

export function AdminSessionTimeout({ timeoutMs }: { timeoutMs: number }) {
  const timerRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const lastActivityAtRef = useRef(Date.now());
  const lastRefreshAtRef = useRef(Date.now());

  useEffect(() => {
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

    function scheduleLogoutFrom(lastActivityAt: number) {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        void logout();
      }, Math.max(timeoutMs - (Date.now() - lastActivityAt), 0));
    }

    async function refreshSession(force = false) {
      const now = Date.now();
      if (!force && now - lastRefreshAtRef.current < SESSION_REFRESH_INTERVAL_MS) {
        return;
      }

      if (refreshInFlightRef.current) {
        return;
      }

      refreshInFlightRef.current = true;

      try {
        const response = await fetch("/api/admin/session/refresh", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.status === 401) {
          void logout();
          return;
        }

        if (response.ok) {
          lastRefreshAtRef.current = now;
        }
      } catch {
        // Ignore refresh failures and let the inactivity timer enforce logout.
      } finally {
        refreshInFlightRef.current = false;
      }
    }

    function markActivity(forceRefresh = false) {
      const now = Date.now();
      if (!forceRefresh && now - lastActivityAtRef.current < ACTIVITY_THROTTLE_MS) {
        return;
      }

      lastActivityAtRef.current = now;
      scheduleLogoutFrom(now);
      void refreshSession(forceRefresh);
    }

    function handlePotentialInactivity() {
      if (Date.now() - lastActivityAtRef.current >= timeoutMs) {
        void logout();
        return;
      }

      markActivity(true);
    }

    function handleActivity() {
      markActivity();
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        handlePotentialInactivity();
      }
    }

    lastActivityAtRef.current = Date.now();
    lastRefreshAtRef.current = Date.now();
    scheduleLogoutFrom(lastActivityAtRef.current);

    const activityEvents = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ] as const;

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handlePotentialInactivity);

    return () => {
      clearTimer();
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handlePotentialInactivity);
    };
  }, [timeoutMs]);

  return null;
}
