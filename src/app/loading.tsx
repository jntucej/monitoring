"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Root loading boundary.
 *
 * The full-screen CinematicLoader (particle field + film grain + "tap to skip")
 * sat on top of the app for the entire duration of streaming + client
 * hydration, and with no `onSkip` it could not be dismissed — so users saw a
 * "stuck" loading page. This replaces it with a small centered spinner that
 * self-dismisses shortly after mount; the real content streams in underneath.
 *
 * The home page (/) opens fast with a lean SSR shell, so it shows NO loading
 * boundary at all — the spinner is suppressed on `/`.
 */
export default function RootLoading() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDismissed(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Home page: no loading overlay.
  if (pathname === "/" || pathname === "") return null;

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-base)]">
      <div
        role="status"
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--action-primary)]"
      />
    </div>
  );
}
