"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, RefreshCw } from "lucide-react";

const SESSION_REFRESH_INTERVAL_MS = 60 * 1000;
const ACTIVITY_THROTTLE_MS = 750;
// Show warning this many ms before auto-logout
const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutes

export function AdminSessionTimeout({ timeoutMs }: { timeoutMs: number }) {
  const timerRef = useRef<number | null>(null);
  const warningTimerRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const lastActivityAtRef = useRef(Date.now());
  const lastRefreshAtRef = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const countdownRef = useRef<number | null>(null);

  useEffect(() => {
    async function logout() {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      try {
        await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin", cache: "no-store" });
      } catch {
        // Ignore
      } finally {
        window.location.href = "/admin/login?error=session-expired";
      }
    }

    function clearTimer() {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (warningTimerRef.current !== null) window.clearTimeout(warningTimerRef.current);
      if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
    }

    function scheduleLogoutFrom(lastActivityAt: number) {
      clearTimer();
      const remaining = Math.max(timeoutMs - (Date.now() - lastActivityAt), 0);
      const warningAt = Math.max(remaining - WARNING_BEFORE_MS, 0);

      // Warning timer
      warningTimerRef.current = window.setTimeout(() => {
        setShowWarning(true);
        let secs = Math.round(Math.min(WARNING_BEFORE_MS, remaining) / 1000);
        setSecondsLeft(secs);
        countdownRef.current = window.setInterval(() => {
          secs -= 1;
          setSecondsLeft(secs);
          if (secs <= 0) {
            if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
          }
        }, 1000);
      }, warningAt);

      // Logout timer
      timerRef.current = window.setTimeout(() => {
        void logout();
      }, remaining);
    }

    async function refreshSession(force = false) {
      const now = Date.now();
      if (!force && now - lastRefreshAtRef.current < SESSION_REFRESH_INTERVAL_MS) return;
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;
      try {
        const response = await fetch("/api/admin/session/refresh", { method: "POST", credentials: "same-origin", cache: "no-store" });
        if (response.status === 401) { void logout(); return; }
        if (response.ok) lastRefreshAtRef.current = now;
      } catch {
        // Ignore
      } finally {
        refreshInFlightRef.current = false;
      }
    }

    function markActivity(forceRefresh = false) {
      const now = Date.now();
      if (!forceRefresh && now - lastActivityAtRef.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityAtRef.current = now;
      setShowWarning(false);
      scheduleLogoutFrom(now);
      void refreshSession(forceRefresh);
    }

    function handlePotentialInactivity() {
      if (Date.now() - lastActivityAtRef.current >= timeoutMs) { void logout(); return; }
      markActivity(true);
    }

    lastActivityAtRef.current = Date.now();
    lastRefreshAtRef.current = Date.now();
    scheduleLogoutFrom(lastActivityAtRef.current);

    const activityEvents = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const ev of activityEvents) window.addEventListener(ev, () => markActivity(), { passive: true });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) handlePotentialInactivity(); });
    window.addEventListener("focus", handlePotentialInactivity);

    return () => {
      clearTimer();
      for (const ev of activityEvents) window.removeEventListener(ev, () => markActivity());
      document.removeEventListener("visibilitychange", () => { if (!document.hidden) handlePotentialInactivity(); });
      window.removeEventListener("focus", handlePotentialInactivity);
    };
  }, [timeoutMs]);

  async function handleKeepAlive() {
    setShowWarning(false);
    if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
    lastActivityAtRef.current = Date.now();
    // Force a session refresh
    try {
      await fetch("/api/admin/session/refresh", { method: "POST", credentials: "same-origin", cache: "no-store" });
    } catch {
      // Ignore
    }
    lastActivityAtRef.current = Date.now();
  }

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-100 p-3">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Session expiring soon</h2>
          <p className="mt-1 text-sm text-muted">
            You&apos;ll be logged out in{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </span>
            {" "}due to inactivity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleKeepAlive()}
          className="btn-primary w-full inline-flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Keep me logged in
        </button>
      </div>
    </div>
  );
}
