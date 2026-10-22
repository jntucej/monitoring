'use client';

import { useEffect } from "react";

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

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunk = isChunkLoadError(error);

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
      className="bg-[var(--bg-base)] text-[var(--text-primary)]"
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
              background: "var(--action-primary, #10b981)",
              color: "#08130f",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload now
          </button>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
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
