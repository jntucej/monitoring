"use client";

import { Suspense, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import {
  Scan,
  KeyRound,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";

interface GatesResponse {
  success: boolean;
  data: Array<{ id: string; name: string; gate_code?: string; is_active?: boolean }>;
}

/**
 * Operator scan desk entry point.
 *
 * The live scanner UX (camera QR / barcode modals, manual roll entry,
 * confirmation flow, per-gate stream cache) lives on /gate/[gateId] and
 * in src/components/operator/* — both locked-in. This page is the
 * deep-link surface: it shows the gate picker (for unassigned or
 * multi-role operators) and hands off to the gate desk.
 */
function OperatorScanInner() {
  const user = useAuthStore((s) => s.user);
  const assignedGateId = user?.gateId || "";

  const [selectedGate, setSelectedGate] = useState<string>(assignedGateId);

  // Gate list is only needed when the operator is not pinned to one gate.
  const {
    data: gates,
    loading: gatesLoading,
  } = useApiResource<GatesResponse>("/api/gates", {
    ttlMs: 60_000,
    enabled: !assignedGateId,
  });

  const activeGates = useMemo(
    () => (gates?.data ?? []).filter((g) => g.is_active !== false),
    [gates]
  );

  const currentGate = useMemo(() => {
    if (selectedGate === assignedGateId) {
      return { id: selectedGate, name: `Gate ${selectedGate}` };
    }
    return activeGates.find((g) => g.id === selectedGate) ?? {
      id: selectedGate,
      name: `Gate ${selectedGate}`,
    };
  }, [selectedGate, assignedGateId, activeGates]);

  const openDesk = () => {
    if (!selectedGate) return;
    window.location.href = `/gate/${encodeURIComponent(selectedGate)}`;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 min-w-0">
      <WidgetBoundary title="Gate Scanner">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 space-y-4 min-w-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Scan Desk
              </h2>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Camera QR / barcode scanning, manual roll entry and pass
              confirmation run at the gate desk. Pick your gate below to
              open the live scanner — the camera starts automatically when
              the desk opens.
            </p>
          </div>

          {/* Gate picker */}
          <div className="space-y-2">
            <label
              htmlFor="operator-gate-select"
              className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
            >
              {assignedGateId ? "Assigned gate" : "Choose gate"}
            </label>
            {assignedGateId ? (
              <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] font-mono">
                {assignedGateId}
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  id="operator-gate-select"
                  value={selectedGate}
                  onChange={(e) => setSelectedGate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                >
                  <option value="">
                    {gatesLoading
                      ? "Loading gates…"
                      : activeGates.length
                        ? "Select a gate"
                        : "No active gates available"}
                  </option>
                  {activeGates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name || g.id}
                      {g.gate_code ? ` (${g.gate_code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!assignedGateId && !selectedGate && !gatesLoading && activeGates.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="min-w-0">
                No active gates found. Ask a system administrator to enable
                a gate (SysAdmin → Gates), then refresh this page.
              </p>
            </div>
          )}

          {/* Hand-off actions */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={openDesk}
              disabled={!selectedGate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--action-primary)] px-4 py-3 text-sm font-bold text-slate-950 hover:brightness-110 disabled:opacity-40 transition disabled:cursor-not-allowed flex-1"
            >
              <Scan className="w-4 h-4" />
              Open Scanner
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={
                selectedGate
                  ? `/gate/${encodeURIComponent(selectedGate)}?tab=scandesk&mode=manual`
                  : "/operator/manual-entry"
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-300 hover:bg-amber-400/20 transition flex-1"
            >
              <KeyRound className="w-4 h-4" />
              Manual Entry
            </a>
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function OperatorScanPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OperatorScanInner />
    </Suspense>
  );
}
