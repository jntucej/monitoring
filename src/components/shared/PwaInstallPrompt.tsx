"use client";
// src/components/shared/PwaInstallPrompt.tsx

import { useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Custom PWA install prompt (UI-audit mobile §9).
 *
 * Shown only on:
 *   - the `beforeinstallprompt` event (Chromium-only; iOS Safari has no API)
 *   - after 2+ visits to the site (pwa_visits counter in localStorage)
 *   - not dismissed within the last 30 days (pwa_dismissed_until)
 *
 * Buttons: "Install" (calls evt.prompt()) / "Not now" (30-day cooldown).
 * Both are 44px+ touch targets (WCAG 2.5.8).
 */
export function PwaInstallPrompt() {
  const evtRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const visits = Number(localStorage.getItem("pwa_visits") || "0") + 1;
    localStorage.setItem("pwa_visits", String(visits));

    const dismissedUntil = Number(localStorage.getItem("pwa_dismissed_until") || "0");
    if (dismissedUntil > Date.now()) return;
    if (visits < 2) return;

    const handler = (e: Event) => {
      e.preventDefault();
      evtRef.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Gate Monitor"
      className="fixed inset-x-4 bottom-20 z-40 rounded-xl bg-[var(--accent,var(--action-primary))] p-4 text-white shadow-lg md:hidden"
    >
      <p className="font-semibold">Install Gate Monitor</p>
      <p className="text-sm opacity-90">Open faster. Get gate-out alerts.</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={async () => {
            if (evtRef.current) {
              await evtRef.current.prompt();
              evtRef.current = null;
            }
            setShow(false);
          }}
          className="min-h11 flex-1 rounded-lg bg-white font-medium text-[var(--accent,var(--action-primary))]"
        >
          Install
        </button>
        <button
          onClick={() => {
            localStorage.setItem("pwa_dismissed_until", String(Date.now() + 30 * 86400000));
            setShow(false);
          }}
          className="min-h11 px-4 text-sm opacity-80"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
