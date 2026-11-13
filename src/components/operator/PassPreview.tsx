"use client";

// Pass preview card for the operator desk. On an OUT scan the desk fetches
// /api/gate/verify-pass for the scanned roll; when a pass exists, this card
// shows ticket, reason, window, and its live status. Valid = green, the
// operator proceeds; expired/used = red, the scan is flagged.

import { useEffect, useState } from "react";
import { Ticket, Clock, CheckCircle2, XCircle, CalendarClock } from "lucide-react";
import { formatTime, getAuthHeaders } from "@/lib/utils";

export type PassPreviewData = {
  ticket_number: string;
  pass_type: string;
  reason: string | null;
  status: string; // VALID | EXPIRED | USED | PENDING
  issued_at: string;
  expires_at: string | null;
  issued_by: string | null;
  [key: string]: unknown;
};

export type PassPreviewProps = {
  /** Live ticket fetched for the scanned roll + chosen OUT reason. */
  pass: PassPreviewData | null;
  /** Reason label the desk is verifying against (e.g. "home_out"). */
  reason?: string;
};

const STATUS_STYLE: Record<
  string,
  { chip: string; label: string; icon: "ok" | "bad" | "clock" }
> = {
  VALID: { chip: "bg-emerald-500/15 text-action-success border-emerald-500/40", label: "Valid", icon: "ok" },
  EXPIRED: { chip: "bg-rose-500/15 text-action-danger border-rose-500/40", label: "Expired", icon: "bad" },
  USED: { chip: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40", label: "Used", icon: "bad" },
  PENDING: {
    chip: "bg-amber-500/15 text-action-warning border-amber-500/40",
    label: "Pending approval",
    icon: "clock",
  },
};

function statusMeta(status: string | undefined) {
  const key = status ? String(status).toUpperCase() : "";
  return (
    STATUS_STYLE[key] ?? {
      chip: "bg-amber-500/15 text-action-warning border-amber-500/40",
      label: status || "Unknown",
      icon: "clock" as const,
    }
  );
}

export function PassPreview({ pass, reason }: PassPreviewProps) {
  const meta = statusMeta(pass?.status);
  if (!pass) return null;

  return (
    <div
      className={`rounded-xl border p-3 bg-bg-surface ${
        meta.icon === "bad" ? "border-rose-500/40" : "border-border"
      }`}
      aria-label="Pass preview"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Ticket className="h-4 w-4 shrink-0 text-text-muted" />
          <span className="font-mono text-xs font-bold truncate">{pass.ticket_number}</span>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${meta.chip}`}
        >
          {meta.label}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-text-muted">
        <dt className="flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden /> Issued
        </dt>
        <dd>{formatTime(pass.issued_at)}</dd>
        <dt className="flex items-center gap-1">
          <CalendarClock className="h-3 w-3" aria-hidden /> Window
        </dt>
        <dd>
          {pass.expires_at
            ? `until ${new Date(pass.expires_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}`
            : "no expiry"}
        </dd>
      </dl>
      {pass.reason && (
        <p className="mt-1.5 text-[11px] text-text-secondary">
          Reason: <strong>{pass.reason}</strong>
          {reason && pass.reason !== reason ? (
            <span className="ml-2 text-action-warning">
              (requested: {reason})
            </span>
          ) : null}
        </p>
      )}
      {pass.status?.toUpperCase() === "EXPIRED" && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-action-danger">
          <XCircle className="h-3 w-3" aria-hidden /> This pass has lapsed — flag the scan.
        </p>
      )}
      {pass.status?.toUpperCase() === "VALID" && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-action-success">
          <CheckCircle2 className="h-3 w-3" aria-hidden /> Pass is live — safe to proceed.
        </p>
      )}
    </div>
  );
}

/**
 * Data-fetching wrapper for the desk: given a roll + the OUT reason being
 * verified, fetches the active pass (if any) and hands it to PassPreview.
 * Renders nothing while loading or when the roll has no pass.
 */
export function PassPreviewFetcher({ roll, reason }: { roll: string; reason: string }) {
  const [pass, setPass] = useState<PassPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch once per roll+reason change.
  useEffect(() => {
    if (!roll) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/gate/verify-pass?roll=${encodeURIComponent(roll)}&reason=${encodeURIComponent(reason)}`,
          { cache: "no-store", headers: getAuthHeaders() },
        );
        if (!res.ok) return;
        const json = await res.json();
        const p = json?.data?.pass ?? json?.pass ?? null;
        if (!cancelled && p) setPass(p);
      } catch {
        /* non-fatal: a preview is advisory, not load-bearing */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  if (loading || !pass) return null;
  return <PassPreview pass={pass} reason={reason} />;
}
