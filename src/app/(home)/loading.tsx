"use client";

import { useEffect, useState } from "react";

/**
 * Minimal, fast homepage loading boundary.
 *
 * Replaces the full-screen CinematicLoader (which felt "stuck" because the
 * particle field / film grain kept animating long after the page was usable).
 * This shows a small centered spinner for a few hundred ms and self-dismisses
 * the moment it mounts, so it never blocks the view.
 */
export default function HomeLoading() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // The boundary only streams briefly; hide the spinner shortly after mount
    // so the real content (painted underneath by the streaming RSC) takes over
    // without a visible full-screen takeover.
    const t = setTimeout(() => setDismissed(true), 250);
    return () => clearTimeout(t);
  }, []);

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-base)]">
      <div
        role="status"
        aria-label="Loading"
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--action-primary)]"
      />
    </div>
  );
}
