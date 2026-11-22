"use client";

/**
 * SynchronizationIndicator — PR-14. The honest "what is the state of this
 * data" line for a panel fed by useSynchronization. It NEVER shows a live
 * dot: the mode is always "refresh" (polling), and the indicator says so.
 * Stale data is visually distinguishable from fresh data (protocol §2.6).
 */
import type { SynchronizationState } from "@/hooks/useSynchronization";

export function SynchronizationIndicator({
  sync,
  className,
  /** Wall-clock ms to render "N ago" against (parent-provided for purity;
   *  defaults to a stable 0 → shows "never" until a real now is passed). */
  nowMs = 0,
}: {
  sync: SynchronizationState;
  className?: string;
  nowMs?: number;
}) {
  const when =
    sync.lastUpdated != null
      ? nowMs > 0
        ? `${Math.max(0, Math.round((nowMs - sync.lastUpdated) / 1000))}s ago`
        : "just now"
      : "never";

  // Honest state line. No "LIVE" badge — the transport is refresh/polling.
  const status = sync.error
    ? "refresh failed"
    : sync.syncing
      ? "refreshing"
      : sync.stale
        ? "stale"
        : "refreshed";

  return (
    <span
      className={className}
      aria-live="off"
      title={sync.error ?? "Data is refreshed on a polling cadence; not live."}
    >
      <span className="text-[11px] text-text-muted">
        <span
          className={
            "mr-1 inline-block size-1.5 rounded-full " +
            (sync.error
              ? "bg-action-danger"
              : sync.stale
                ? "bg-action-warning"
                : "bg-action-success")
          }
          aria-hidden="true"
        />
        {sync.mode === "refresh" ? "Refreshed" : sync.mode} {when}
        {" · "}
        {status}
        {sync.connection === "offline" ? " · offline" : null}
      </span>
      {sync.error ? (
        <span className="ml-1 text-[11px] text-action-danger" role="alert">
          — {sync.error}
        </span>
      ) : null}
    </span>
  );
}

export default SynchronizationIndicator;
