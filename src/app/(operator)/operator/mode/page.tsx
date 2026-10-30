"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import {
  Loader2,
  Wrench,
  Moon,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

type GateMode = "OPEN" | "CURFEW" | "MAINTENANCE";

function ModeCard({
  mode,
  label,
  description,
  icon: Icon,
  color,
  selected,
  disabled,
  onClick,
}: {
  mode: GateMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || selected}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        selected
          ? `${color} border-current bg-current/10`
          : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border)]"
      } ${disabled && !selected ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 shrink-0 ${selected ? "text-current" : "text-[var(--text-muted)]"}`} />
        <div className="min-w-0">
          <p className={`text-sm font-bold ${selected ? "text-current" : "text-[var(--text-primary)]"}`}>{label}</p>
          <p className={`text-xs mt-0.5 ${selected ? "text-current/80" : "text-[var(--text-muted)]"}`}>{description}</p>
        </div>
        {selected && <ShieldCheck className="w-4 h-4 shrink-0 ml-auto" />}
      </div>
    </button>
  );
}

function OperatorModeInner() {
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<GateMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const loadMode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/operator/mode", { headers: getAuthHeaders(), cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) {
        setMode(json.data?.mode || "OPEN");
      } else {
        setError(json.error?.message || "Could not load gate mode");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMode(); }, [loadMode]);

  usePolling(loadMode, { intervalMs: 15_000, enabled: !!user });

  const handleSetMode = async (newMode: GateMode) => {
    if (newMode === mode) return;
    setSubmitting(true);
    setSubmitMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/operator/mode", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode, reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMode(newMode);
        setSubmitMsg(`Gate mode set to ${newMode}.`);
        setReason("");
      } else {
        setError(json.error?.message || "Failed to set mode");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const modes: { mode: GateMode; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { mode: "OPEN", label: "Normal", description: "Routine scans allowed. No curfew or maintenance restrictions.", icon: ShieldCheck },
    { mode: "CURFEW", label: "Curfew", description: "Night curfew active. Override reason required for student exits.", icon: Moon },
    { mode: "MAINTENANCE", label: "Maintenance", description: "Scheduled maintenance in progress. Routine scans temporarily blocked.", icon: Wrench },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Gate Mode</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1 min-w-0">
          Change the gate operating mode. Active mode applies to all gates.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="truncate">{error}</span>
          <button type="button" onClick={() => void loadMode()} className="ml-auto text-xs font-semibold hover:underline shrink-0">Retry</button>
        </div>
      )}

      {submitMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300 min-w-0">
          {submitMsg}
        </div>
      )}

      <OperatorWidgetBoundary title="Current Mode">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 min-w-0">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading…
            </div>
          ) : mode ? (
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[var(--action-primary)] shrink-0" />
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {modes.find((m) => m.mode === mode)?.label || mode}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {modes.find((m) => m.mode === mode)?.description}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Unable to determine gate mode.</p>
          )}
        </div>
      </OperatorWidgetBoundary>

      <OperatorWidgetBoundary title="Change Mode">
        <div className="space-y-3 min-w-0">
          {modes.map((m) => (
            <ModeCard
              key={m.mode}
              mode={m.mode}
              label={m.label}
              description={m.description}
              icon={m.icon}
              color={
                m.mode === "OPEN" ? "text-emerald-500 border-emerald-500"
                : m.mode === "CURFEW" ? "text-indigo-400 border-indigo-400"
                : "text-amber-500 border-amber-500"
              }
              selected={mode === m.mode}
              disabled={submitting}
              onClick={() => void handleSetMode(m.mode)}
            />
          ))}

          <div className="space-y-1.5 pt-2 min-w-0">
            <label htmlFor="mode-reason" className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              Reason (optional)
            </label>
            <input
              id="mode-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scheduled system update"
              disabled={submitting}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const selected = modes.find((m) => m.mode === mode);
              if (selected) void handleSetMode(selected.mode);
            }}
            disabled={submitting || !mode}
            className="w-full rounded-lg bg-[var(--action-primary)] px-4 py-2.5 text-sm font-bold text-slate-950 hover:brightness-110 disabled:opacity-40 transition disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                Applying…
              </span>
            ) : (
              "Apply Mode"
            )}
          </button>
        </div>
      </OperatorWidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function OperatorModePage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <OperatorModeInner />
    </Suspense>
  );
}
