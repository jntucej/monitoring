"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import {
  Camera, CheckCircle2, KeyRound, Loader2, ScanLine, XCircle,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

interface VerifyResult {
  ok: true;
  tokenId: string;
  userId: string;
  name: string;
  uniqueId: string;
  itemIds: string[];
  itemLabels: string[];
  method: "QR" | "MANUAL";
  expiresAt: string;
}
interface VerifyFailure {
  ok: false;
  code: string;
  message: string;
}
type Step =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "verifying" }
  | { kind: "ready"; result: VerifyResult; token: string | null }
  | { kind: "error"; message: string; code: string };

/**
 * Serving-counter UI for the special-event meal token:
 *  - Scan the student's QR token (single-use, signed), or
 *  - Enter roll + 6-character manual code.
 * Verify is non-destructive; "Serve meal" atomically consumes the token.
 */
export function TokenVerifier({ eventId }: { eventId: string }) {
  const addToast = useUIStore((s) => s.addToast);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [mode, setMode] = useState<"QR" | "MANUAL">("QR");
  const [roll, setRoll] = useState("");
  const [code, setCode] = useState("");

  // Direct camera scan (opaque token — NOT the gate roll normalizer).
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef(0);
  const scanningRef = useRef(false);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      scanningRef.current = true;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const tick = () => {
        if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;
        const v = videoRef.current;
        const c = canvasRef.current;
        if (v.readyState === 4 && c.width > 0) {
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(v, 0, 0, c.width, c.height);
            const img = ctx.getImageData(0, 0, c.width, c.height);
            const now = Date.now();
            if (now - lastScanRef.current > 150) {
              const detected = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
              if (detected?.data) {
                lastScanRef.current = now;
                const qrToken = detected.data;
                stopCamera();
                setStep({ kind: "verifying" });
                void verify("QR", qrToken);
                return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      addToast({ message: "Camera unavailable — use manual code", variant: "error" });
      stopCamera();
    }
  }, [stopCamera, addToast]);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const verify = useCallback(
    async (m: "QR" | "MANUAL", qrToken?: string) => {
      setStep({ kind: "verifying" });
      try {
        const payload: Record<string, unknown> = { mode: m, serve: false };
        if (m === "QR") payload.qrToken = qrToken;
        else { payload.roll = roll; payload.manualCode = code; }
        const res = await fetch(`/api/mess/special-events/${eventId}/token/verify`, {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || body?.data == null) {
          const err = body?.message ?? "Verification failed";
          const c = body?.error ?? "VERIFY_FAILED";
          setStep({ kind: "error", code: String(c), message: err });
          return;
        }
        if (body?.data == null) {
          const err = body?.message ?? "Verification failed";
          const c = body?.error ?? "VERIFY_FAILED";
          setStep({ kind: "error", code: String(c), message: err });
          return;
        }
        const r = body.data.result as VerifyResult;
        setStep({ kind: "ready", result: r, token: m === "QR" ? qrToken ?? null : null });
      } catch (e) {
        setStep({ kind: "error", code: "NETWORK", message: e instanceof Error ? e.message : "Network error" });
      }
    },
    [addToast, eventId, roll, code],
  );

  const serve = async () => {
    if (step.kind !== "ready") return;
    setStep({ kind: "verifying" });
    try {
      const m = step.result.method;
      const payload: Record<string, unknown> = { mode: m, serve: true };
      if (m === "QR") payload.qrToken = step.token;
      else { payload.roll = step.result.uniqueId; payload.manualCode = code; }
      const res = await fetch(`/api/mess/special-events/${eventId}/token/verify`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) {
        addToast({ message: body?.message ?? "Serve failed", variant: "error" });
        setStep({ kind: "ready", result: step.result, token: step.token });
        return;
      }
      const r = body.data.result as VerifyResult;
      addToast({ message: `Served to ${r.name}`, variant: "success" });
      setStep({ kind: "idle" });
      setRoll(""); setCode("");
    } catch (e) {
      addToast({ message: e instanceof Error ? e.message : "Serve failed", variant: "error" });
      if (step.kind === "ready") setStep({ kind: "ready", result: step.result, token: step.token });
    }
  };

  const reset = () => { stopCamera(); setStep({ kind: "idle" }); setRoll(""); setCode(""); };

  return (
    <WidgetBoundary title="Token verifier">
      <div className="space-y-4">
        <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-1">
          <button
            type="button"
            onClick={() => { stopCamera(); setMode("QR"); if (step.kind !== "idle") reset(); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${mode === "QR" ? "bg-[var(--action-primary)] text-white" : "text-[var(--text-secondary)]"}`}
          >
            <Camera className="h-4 w-4" /> Scan QR
          </button>
          <button
            type="button"
            onClick={() => { stopCamera(); setMode("MANUAL"); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${mode === "MANUAL" ? "bg-[var(--action-primary)] text-white" : "text-[var(--text-secondary)]"}`}
          >
            <KeyRound className="h-4 w-4" /> Manual code
          </button>
        </div>

        {/* Opaque QR viewfinder — renders only while scanning. */}
        {step.kind === "scanning" && (
          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-black">
              <video ref={videoRef} className="h-48 w-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <button type="button" onClick={reset} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              Cancel
            </button>
          </div>
        )}

        {step.kind === "idle" && mode === "QR" && (
          <button
            type="button"
            onClick={() => { setStep({ kind: "scanning" }); void openCamera(); }}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-12 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
          >
            <Camera className="h-8 w-8" />
            Tap to open the camera and scan the student's QR token
          </button>
        )}

        {step.kind === "idle" && mode === "MANUAL" && (
          <form
            onSubmit={(e) => { e.preventDefault(); void verify("MANUAL"); }}
            className="grid gap-3 md:grid-cols-2"
          >
            <label className="text-sm text-[var(--text-secondary)]">
              Roll / Unique ID
              <input
                value={roll}
                onChange={(e) => setRoll(e.target.value.toUpperCase())}
                placeholder="24JJ1A0501"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="text-sm text-[var(--text-secondary)]">
              6-character code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC234"
                maxLength={6}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm tracking-widest"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={!roll || code.length !== 6}
                className="rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Verify
              </button>
            </div>
          </form>
        )}

        {step.kind === "verifying" && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
          </div>
        )}

        {step.kind === "error" && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            <XCircle className="mr-1 inline h-4 w-4" /> {step.message}
            <button type="button" onClick={reset} className="ml-2 underline">Try again</button>
          </div>
        )}

        {step.kind === "ready" && (
          <SectionCard title="Ready to serve" description={`Verified via ${step.result.method}`}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-lg font-semibold text-[var(--text-primary)]">{step.result.name}</div>
                <div className="font-mono text-sm text-[var(--text-secondary)]">{step.result.uniqueId}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Selected items</div>
                <ul className="mt-1 space-y-1 text-sm text-[var(--text-primary)]">
                  {step.result.itemLabels.map((l, i) => (
                    <li key={step.result.itemIds[i]} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {l}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={reset} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void serve()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white"
              >
                <ScanLine className="h-4 w-4" /> Serve meal
              </button>
            </div>
          </SectionCard>
        )}
      </div>
    </WidgetBoundary>
  );
}
