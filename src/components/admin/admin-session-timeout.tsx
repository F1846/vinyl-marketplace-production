"use client";

import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "pointerdown",
  "scroll",
  "touchstart",
] as const;

export function AdminSessionTimeout({ timeoutMs }: { timeoutMs: number }) {
  const timerRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);

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

    function startTimer() {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        void logout();
      }, timeoutMs);
    }

    function handleActivity() {
      startTimer();
    }

    startTimer();
    document.addEventListener("visibilitychange", handleActivity);

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", handleActivity);

      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
    };
  }, [timeoutMs]);

  return null;
}
