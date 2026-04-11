"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, RefreshCw } from "lucide-react";

const SESSION_REFRESH_INTERVAL_MS = 60 * 1000;
const ACTIVITY_THROTTLE_MS = 750;
// Show warning this many ms before auto-logout
const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutes
// eslint-disable-next-line no-unused-vars
type ScheduleLogoutFn = (lastActivityAtMs: number) => void;
// eslint-disable-next-line no-unused-vars
type RefreshSessionFn = (forceRefresh?: boolean) => Promise<void>;

export function AdminSessionTimeout({ timeoutMs }: { timeoutMs: number }) {
  const timerRef = useRef<number | null>(null);
  const warningTimerRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const warningVisibleRef = useRef(false);
  const lastActivityAtRef = useRef(Date.now());
  const lastRefreshAtRef = useRef(Date.now());
  const scheduleLogoutRef = useRef<ScheduleLogoutFn | null>(null);
  const refreshSessionRef = useRef<RefreshSessionFn | null>(null);
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
        warningVisibleRef.current = true;
        setShowWarning(true);
        let secs = Math.max(0, Math.ceil(Math.min(WARNING_BEFORE_MS, remaining) / 1000));
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
    scheduleLogoutRef.current = scheduleLogoutFrom;

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
    refreshSessionRef.current = refreshSession;

    function markActivity(forceRefresh = false) {
      if (warningVisibleRef.current) return;
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
    warningVisibleRef.current = false;
    scheduleLogoutFrom(lastActivityAtRef.current);

    const handlePointerDown = () => markActivity();
    const handleKeyDown = () => markActivity();
    const handleScroll = () => markActivity();
    const handleTouchStart = () => markActivity();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handlePotentialInactivity();
      }
    };

    const activityEvents = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    window.addEventListener(activityEvents[0], handlePointerDown, { passive: true });
    window.addEventListener(activityEvents[1], handleKeyDown, { passive: true });
    window.addEventListener(activityEvents[2], handleScroll, { passive: true });
    window.addEventListener(activityEvents[3], handleTouchStart, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handlePotentialInactivity);

    return () => {
      clearTimer();
      scheduleLogoutRef.current = null;
      refreshSessionRef.current = null;
      window.removeEventListener(activityEvents[0], handlePointerDown);
      window.removeEventListener(activityEvents[1], handleKeyDown);
      window.removeEventListener(activityEvents[2], handleScroll);
      window.removeEventListener(activityEvents[3], handleTouchStart);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handlePotentialInactivity);
    };
  }, [timeoutMs]);

  async function handleKeepAlive() {
    warningVisibleRef.current = false;
    setShowWarning(false);
    if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
    const now = Date.now();
    lastActivityAtRef.current = now;
    await refreshSessionRef.current?.(true);
    scheduleLogoutRef.current?.(now);
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
            {" "}due to inactivity. Continue to stay signed in for another 10 minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleKeepAlive()}
          className="btn-primary w-full inline-flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Continue session
        </button>
      </div>
    </div>
  );
}
