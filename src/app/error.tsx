// src/app/error.tsx
//
// Root-level error boundary. Catches:
//   - React render errors in the client tree
//   - Chunk load failures (auto-reload up to 2×, then surface error)
//   - Network errors during navigation (offline, ERR_INTERNET_DISCONNECTED)
//
// The offline case is distinct: when the browser can't reach the server
// at all, the user needs to know WHY (not "Something went wrong") and
// get a "Retry when back online" affordance instead of a blank screen.

'use client';

import { useEffect, useState } from "react";

function isChunkLoadError(error: Error): boolean {
  const msg = (error?.message || "").toLowerCase();
  const name = (error?.name || "").toLowerCase();
  return (
    name === "chunkloaderror" ||
    msg.includes("failed to load chunk") ||
    msg.includes("chunkloaderror") ||
    msg.includes("loading chunk") ||
    msg.includes("chunk load error") ||
    msg.includes("could not load")
  );
}

/**
 * Detect network-level failures that Next.js surfaces as generic Errors.
 * These are NOT React bugs — the user lost connectivity mid-navigation.
 */
function isNetworkError(error: Error): boolean {
  const msg = (error?.message || "").toLowerCase();
  const name = (error?.name || "").toLowerCase();
  return (
    name === "networkerror" ||
    name === "timeout" ||
    msg.includes("failed to fetch") ||
    msg.includes("err_internet_disconnected") ||
    msg.includes("err_network") ||
    msg.includes("network request failed") ||
    msg.includes("networkerror") ||
    msg.includes("load failed")
  );
}

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunk = isChunkLoadError(error);
  const network = !chunk && isNetworkError(error);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!network) return;
    setOnline(navigator.onLine);
    const handler = () => setOnline(navigator.onLine);
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
    };
  }, [network]);

  useEffect(() => {
    if (!chunk) return;
    const key = "gate-monitor-chunk-recover";
    const count = Number(localStorage.getItem(key) || "0");
    if (count < 2) {
      localStorage.setItem(key, String(count + 1));
      const t = setTimeout(() => window.location.reload(), 250);
      return () => clearTimeout(t);
    }
    localStorage.removeItem(key);
  }, [chunk]);

  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "2rem",
        textAlign: "center",
      }}
      className="bg-bg-base text-text-primary"
    >
      {chunk ? (
        <>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Reloading latest version…
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            A new version just deployed. Refreshing to pick up the latest build.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("gate-monitor-chunk-recover");
              window.location.reload();
            }}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "var(--action-primary, var(--action-success))",
              color: "var(--bg-base)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload now
          </button>
        </>
      ) : network ? (
        <>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            You&apos;re offline
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            We couldn&apos;t reach the server.
            {online
              ? " Your connection just came back — reload to continue."
              : " Check your connection and try again."}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "var(--action-primary, var(--action-success))",
              color: "var(--bg-base)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {online ? "Reload now" : "Retry when back online"}
          </button>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </>
      )}
    </main>
  );
}
