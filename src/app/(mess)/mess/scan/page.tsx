"use client";


import { Suspense, useCallback, useState } from "react";
import {
  ScanLine,
  KeyRound,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  Beef,
  Camera,
  RotateCcw,
  User,
} from "lucide-react";
import { Scanner } from "@/components/operator/Scanner";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import type { MessToken } from "@/lib/types";

type ScanState =
  | { kind: "idle" }
  | { kind: "loading"; code: string }
  | { kind: "result"; code: string; token: MessToken; serving: boolean; servedAt: string | null }
  | { kind: "error"; code: string; message: string };

function fmtTs(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

async function fetchToken(code: string): Promise<MessToken> {
  const res = await fetch(`/api/mess/token/${encodeURIComponent(code)}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      typeof json?.error === "string" ? json.error : json?.error?.message ?? `HTTP ${res.status}`
    );
  }
  const data: unknown = json.data ?? json;
  const token = data as MessToken;
  if (!token || typeof token.valid !== "boolean") {
    throw new Error("Unexpected token payload from server");
  }
  return token;
}

async function serveToken(code: string): Promise<{ servedAt: string }> {
  const res = await fetch("/api/mess/serve", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ tokenCode: code }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      typeof json?.error === "string" ? json.error : json?.error?.message ?? `HTTP ${res.status}`
    );
  }
  const data: { servedAt?: string } = json.data ?? json;
  return { servedAt: data.servedAt ?? new Date().toISOString() };
}

function ScanPageInner() {
  const { addToast } = useUIStore();
  const [showScanner, setShowScanner] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualChecking] = useState(false);
  const [state, setState] = useState<ScanState>({ kind: "idle" });

  const lookup = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setState({ kind: "loading", code: trimmed });
    try {
      const token = await fetchToken(trimmed);
      setState({ kind: "result", code: trimmed, token, serving: false, servedAt: null });
    } catch (err) {
      setState({
        kind: "error",
        code: trimmed,
        message: err instanceof Error ? err.message : "Lookup failed",
      });
    }
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualChecking || !manualCode.trim()) return;
    setManualOpen(false);
    await lookup(manualCode);
  };

  const handleServe = async () => {
    if (state.kind !== "result" || state.serving || !state.token.valid) return;
    setState((s) => (s.kind === "result" ? { ...s, serving: true } : s));
    try {
      const { servedAt } = await serveToken(state.code);
      setState({ kind: "result", code: state.code, token: state.token, serving: false, servedAt });
      addToast({
        variant: "success",
        title: "Meal served",
        message:
          state.token.primaryItem === "NON_VEG"
            ? "Non-veg token served."
            : "Veg token served.",
      });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Serve failed",
        message: err instanceof Error ? err.message : "Could not serve token",
      });
      setState({
        ...state,
        serving: false,
        token: { ...state.token, valid: false, reason: "serve_failed" },
      });
    }
  };

  const reset = () => {
    setState({ kind: "idle" });
    setManualCode("");
  };

  const isServed = state.kind === "result" && !!state.servedAt;
  const serveable = state.kind === "result" && state.token.valid && !state.serving && !isServed;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5">
      {/* Header */}
      <div className="surface-card bg-bg-elevated p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-4">
            <div className="w-6 h-6 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ScanLine className="w-6 h-6 text-action-success" />
            </div>
            <div className="min-w-4">
              <p className="text-base sm:text-lg font-black text-white truncate">Token Scanner</p>
              <p className="text-xs text-text-muted">Scan or enter a mess token code to serve</p>
            </div>
          </div>
          <span className="surface-card inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-action-success text-xs font-black uppercase tracking-wider">
            <Camera className="size-3.5" /> Scan
          </span>
        </div>
      </div>

      {/* Camera scan CTA */}
      <WidgetBoundary title="Scanner">
        <button
          onClick={() => setShowScanner(true)}
          className="surface-card w-full inline-flex min-h11 items-center justify-center gap-2 px-4 py-4 bg-action-success hover:bg-action-success text-white text-sm font-black uppercase tracking-wider transition"
        >
          <ScanLine className="w-4 h-4" /> Open Camera Scanner
        </button>
      </WidgetBoundary>

      {/* Manual entry fallback */}
      <WidgetBoundary title="Manual entry">
        <div className="surface-card bg-bg-elevated p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-bg-elevated/10 border border-border/20 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-text-muted" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Manual Entry
            </span>
          </div>
          <p className="text-xs text-text-muted">
            No camera? Type the code shown on the student&apos;s token screen and confirm.
          </p>
          <button
            onClick={() => setManualOpen((o) => !o)}
            className="surface-card inline-flex min-h11 items-center gap-1.5 px-3 py-2 bg-bg-elevated hover:bg-bg-elevated text-text-secondary text-xs font-bold transition"
          >
            <KeyRound className="w-3.5 h-3.5 text-action-success" />
            {manualOpen ? "Hide entry form" : "Enter token code"}
          </button>

          {manualOpen && (
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. M2610-4F7A2"
                autoFocus
                className="surface-card w-full min-h11 px-3 py-2.5 bg-bg-surface text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:"
              />
              <button
                type="submit"
                disabled={manualChecking || !manualCode.trim()}
                className="surface-card w-full inline-flex min-h11 items-center justify-center gap-2 px-3 py-2.5 bg-action-success hover:bg-action-success disabled:opacity-40 text-white text-xs font-bold transition"
              >
                {manualChecking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Confirm Code
              </button>
            </form>
          )}
        </div>
      </WidgetBoundary>

      {/* Result / status panel */}
      <WidgetBoundary title="Token result">
        <div className="rounded-2xl border border-border bg-bg-elevated overflow-hidden">
          {state.kind === "idle" && (
            <div className="p-10 text-center space-y-2">
              <div className="size-6 mx-auto bg-bg-elevated/10 border border-border/20 flex items-center justify-center">
                <ScanLine className="w-6 h-6 text-text-muted" />
              </div>
              <p className="text-xs text-text-muted">
                Scan a token or type its code above to load details here.
              </p>
            </div>
          )}

          {state.kind === "loading" && (
            <div className="p-10 text-center space-y-3">
              <Loader2 className="size-6 mx-auto text-action-success animate-spin" />
              <p className="text-xs text-text-muted">
                Looking up <span className="font-mono text-action-success">{state.code}</span>…
              </p>
            </div>
          )}

          {state.kind === "error" && (
            <div className="p-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="size-6 bg-rose-500/15 text-action-danger border border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="min-w-4">
                  <p className="text-sm font-bold text-action-danger">Token invalid or error</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Code <span className="font-mono">{state.code}</span> — {state.message}
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="surface-card inline-flex min-h11 items-center gap-1.5 px-3 py-2 bg-bg-elevated hover:bg-bg-elevated text-text-secondary text-xs font-bold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          )}

          {state.kind === "result" && (
            <div className="space-y-4 p-5 sm:p-6">
              {/* BIG color call-out */}
              <div
                className={`rounded-2xl p-5 text-center border ${
                  isServed
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : state.token.primaryItem === "NON_VEG"
                      ? "bg-rose-500/10 border-rose-500/40"
                      : "bg-emerald-500/10 border-emerald-500/40"
                }`}
              >
                {isServed ? (
                  <>
                    <CheckCircle2
                      className={`size-6 mx-auto mb-2 text-action-success ${
                        state.token.primaryItem === "NON_VEG" ? "text-action-danger" : ""
                      }`}
                    />
                    <p className="text-2xl font-black text-action-success">SERVED</p>
                    <p className="text-xs text-text-muted mt-1">
                      Served at {fmtTs(state.servedAt)}
                    </p>
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {state.token.primaryItem === "NON_VEG" ? (
                        <Beef className="w-6 h-6 text-action-danger" />
                      ) : (
                        <Leaf className="w-6 h-6 text-action-success" />
                      )}
                      <span
                        className={`text-4xl font-black tracking-widest ${
                          state.token.primaryItem === "NON_VEG" ? "text-action-danger" : "text-action-success"
                        }`}
                      >
                        {state.token.primaryItem === "NON_VEG" ? "NON-VEG" : "VEG"}
                      </span>
                    </div>
                    {!state.token.valid && (
                      <p className="text-xs font-bold text-action-danger mt-1">
                        {state.token.reason ?? "This token is not servable"}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Student + sub items */}
              <div className="surface-card bg-bg-surface/40 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-6 bg-bg-elevated border border-border flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-text-muted" />
                  </div>
                  <div className="min-w-4">
                    <p className="text-sm font-bold text-white truncate">
                      {state.token.studentName ?? "Unknown student"}
                    </p>
                    <p className="text-xs text-text-muted font-mono">
                      Roll {state.token.studentRoll ?? "—"}
                    </p>
                  </div>
                </div>

                {(state.token.subItemLabels?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                      Sub items
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {state.token.subItemLabels!.map((l) => (
                        <span
                          key={l}
                          className="surface-card px-2 py-0.5 bg-bg-elevated text-xs font-semibold text-text-secondary"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {state.token.revokedAt && (
                  <p className="text-xs text-action-danger font-semibold">
                    Token was revoked at {fmtTs(state.token.revokedAt)}
                  </p>
                )}
                {state.token.expiresAt && (
                  <p className="text-xs text-text-muted">
                    Expires {fmtTs(state.token.expiresAt)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                {serveable && (
                  <button
                    onClick={handleServe}
                    disabled={state.serving}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-black uppercase tracking-wider transition disabled:opacity-50 ${
                      state.token.primaryItem === "NON_VEG"
                        ? "bg-action-danger hover:bg-action-danger"
                        : "bg-action-success hover:bg-action-success"
                    }`}
                  >
                    {state.serving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Confirm Serve
                  </button>
                )}
                <button
                  onClick={reset}
                  className="surface-card inline-flex items-center justify-center gap-2 px-4 py-3 bg-bg-elevated hover:bg-bg-elevated text-text-secondary text-xs font-bold transition"
                >
                  <RotateCcw className="w-4 h-4" /> New Scan
                </button>
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Camera scanner modal (reused operator Scanner) */}
      <Scanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => {
          setShowScanner(false);
          void lookup(code);
        }}
        onManualEntryClick={() => {
          setManualOpen(true);
        }}
      />
    </div>
  );
}

export default function MessScanPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center min-h-[50vh]">
          <div className="size-6 border-4 borderaction-success border-t-transparent animate-spin" />
        </div>
      }
    >
      <ScanPageInner />
    </Suspense>
  );
}
