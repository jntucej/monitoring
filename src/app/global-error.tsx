'use client';

import { useEffect } from "react";

/**
 * Detect a chunk-load failure — the classic "Failed to load chunk" that appears
 * when a logged-in tab holds an *older* build's HTML after a deploy replaced
 * the content-hashed chunks. Rather than dead-ending the user on an error
 * screen, we recover by reloading the page: the browser re-fetches fresh HTML
 * + fresh chunk refs, and the tab self-heals on the next deploy.
 *
 * Chunk-load errors surface with messages like:
 *   "Failed to load chunk _next/static/chunks/<hash>.js"
 *   "Loading chunk <hash> failed after 3 tries..."
 *   "ChunkLoadError"
 * Webpack/Turbopack also set `error.name = "ChunkLoadError"` when configured.
 */
function isChunkLoadError(error: Error): boolean {
  const msg = (error?.message || "").toLowerCase();
  const name = (error?.name || "").toLowerCase();
  return (
    name === "chunkloaderror" ||
    msg.includes("failed to load chunk") ||
    msg.includes("chunkloaderror") ||
    msg.includes("loading chunk") ||
    msg.includes("chunk load error") ||
    msg.includes("could not load") // next static asset load failures
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunk = isChunkLoadError(error);

  useEffect(() => {
    // Auto-recover chunk-load failures: reload once to pick up the fresh build.
    // Guard against a reload loop (e.g. a genuinely broken build) with a counter.
    if (!chunk) return;
    const key = "gate-monitor-chunk-recover";
    const count = Number(localStorage.getItem(key) || "0");
    if (count < 2) {
      localStorage.setItem(key, String(count + 1));
      const t = setTimeout(() => window.location.reload(), 250);
      return () => clearTimeout(t);
    }
    // Two consecutive reload failures — stop auto-reloading; user can Try again.
    localStorage.removeItem(key);
  }, [chunk]);

  return (
    <html>
      <body
        style={{
          padding: "2rem",
          textAlign: "center",
          fontFamily: "sans-serif",
          minHeight: "60vh",
        }}
      >
        <h1>{chunk ? "Reloading latest version…" : "Application error"}</h1>
        <p>
          {chunk
            ? "A new version just deployed. Refreshing to pick up the latest build — one moment."
            : error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => {
            // A hard navigate to home + reload clears the stale chunk map.
            localStorage.removeItem("gate-monitor-chunk-recover");
            window.location.href = "/";
          }}
          style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          {chunk ? "Reload now" : "Try again"}
        </button>
      </body>
    </html>
  );
}
