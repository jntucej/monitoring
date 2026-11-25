"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CounterBar } from "./CounterBar";
import { ResultScreen, type ScanResultData } from "./ResultScreen";

export type ScannerState = "idle" | "scanning" | "green" | "red" | "amber";

export const DISMISS_MS: Record<"green" | "red" | "amber", number> = {
  green: 1800,
  red: 3000,
  amber: 4000,
};

function playFeedback(tone: "green" | "red" | "amber") {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(tone === "green" ? 60 : tone === "amber" ? [80, 50, 80] : [150, 60, 150]);
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = tone === "green" ? 880 : tone === "amber" ? 520 : 220;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + (tone === "green" ? 0.12 : 0.25));
  } catch {
    // Audio/haptic optional
  }
}

export function MessScanner({
  counterId,
  counterName,
  sessionId,
  mealType,
  initialServed = 0,
  capacity = null,
}: {
  counterId: string;
  counterName: string;
  sessionId: string;
  mealType: string;
  initialServed?: number;
  capacity?: number | null;
}) {
  const [state, setState] = useState<ScannerState>("idle");
  const [result, setResult] = useState<ScanResultData | null>(null);
  const [served, setServed] = useState(initialServed);
  const [qrInput, setQrInput] = useState("");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideStudentId, setOverrideStudentId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onScan = useCallback(
    async (qr: string) => {
      if (!qr.trim()) return;
      setState("scanning");
      try {
        const r = await fetch("/api/mess/serve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr: qr.trim(), counter_id: counterId, session_id: sessionId }),
        });
        const j: ScanResultData = await r.json();
        const tone: "green" | "red" | "amber" =
          j.outcome === "ok" ? "green" : j.outcome === "duplicate" ? "amber" : "red";
        if (tone === "green") setServed((s) => s + 1);
        setResult(j);
        setState(tone);
        playFeedback(tone);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setState("idle");
          setQrInput("");
        }, DISMISS_MS[tone]);
      } catch {
        setResult({ outcome: "error", reason: "Network error" });
        setState("red");
        playFeedback("red");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setState("idle"), DISMISS_MS.red);
      }
    },
    [counterId, sessionId],
  );

  async function submitOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!overrideStudentId.trim() || !overrideReason.trim()) return;
    const r = await fetch("/api/mess/serve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manual_override: true,
        student_id: overrideStudentId.trim(),
        reason_text: overrideReason.trim(),
        counter_id: counterId,
        session_id: sessionId,
      }),
    });
    if (r.ok) {
      setServed((s) => s + 1);
      setOverrideOpen(false);
      setOverrideStudentId("");
      setOverrideReason("");
      setResult({ outcome: "manual_override", reason: "Manual override logged" });
      setState("amber");
      timerRef.current = setTimeout(() => setState("idle"), DISMISS_MS.amber);
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col overflow-hidden bg-background text-foreground">
      <CounterBar
        mealType={mealType}
        counterName={counterName}
        served={served}
        capacity={capacity}
      />

      {(state === "idle" || state === "scanning") && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="flex h-56 w-56 items-center justify-center border-2 border-dashed border-primary/60 text-center text-sm text-foreground">
            {state === "scanning" ? "Verifying..." : "Scan rotating QR token"}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onScan(qrInput);
            }}
            className="flex w-full max-w-md gap-2"
          >
            <input
              type="text"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Paste or scan MESS|... QR payload"
              className="flex-1 border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <button
              type="submit"
              className="bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Scan
            </button>
          </form>
        </div>
      )}

      {(state === "green" || state === "red" || state === "amber") && (
        <ResultScreen tone={state} data={result} />
      )}

      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs text-foreground">Station: Mess Counter</span>
        <button
          type="button"
          onClick={() => setOverrideOpen((v) => !v)}
          className="px-3 py-1 text-xs font-medium text-primary underline"
        >
          Manual Override
        </button>
      </div>

      {overrideOpen && (
        <form onSubmit={submitOverride} className="space-y-2 px-4 pb-4">
          <input
            type="text"
            value={overrideStudentId}
            onChange={(e) => setOverrideStudentId(e.target.value)}
            placeholder="Student UUID"
            className="w-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
            required
          />
          <input
            type="text"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Reason (required — alerts mess incharge)"
            className="w-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOverrideOpen(false)}
              className="px-3 py-1 text-xs text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              Log Override
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
