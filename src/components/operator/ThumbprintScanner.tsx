"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface ThumbprintScannerProps {
  isOpen: boolean;
  personId: string;
  personName: string;
  personUniqueId?: string;
  onResult: (result: { verified: boolean; fallback?: boolean; code?: string }) => void;
  onCancel: () => void;
}

type ScanStatus = "idle" | "scanning" | "success" | "failed" | "no_record";

/**
 * Thumbprint (biometric) confirmation shown after the ID scan.
 *
 * Calls POST /api/gate/verify-thumbprint and maps the three outcomes:
 *   - VERIFIED            → onResult({ verified: true })
 *   - INVALID_THUMBPRINT  → retry (max 3), then deny
 *   - NO_THUMBPRINT       → "not in database" → onResult({ verified: false, fallback: true })
 *
 * NOTE: `captureSignature()` currently returns a MOCK signature because no
 * hardware fingerprint SDK is integrated yet. Swap it for the real scanner
 * SDK when hardware arrives — the verification contract stays identical.
 */
export function ThumbprintScanner({
  isOpen,
  personId,
  personName,
  personUniqueId,
  onResult,
  onCancel,
}: ThumbprintScannerProps) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [forceFail, setForceFail] = useState(false);
  const maxAttempts = 3;
  const isDev = process.env.NODE_ENV === "development";
  const runningRef = useRef(false);
  const attemptRef = useRef(0);

  const authHeaders = useCallback((): Record<string, string> => {
    const auth = useAuthStore.getState();
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (auth.token) h["Authorization"] = `Bearer ${auth.token}`;
    if (auth.user?.currentSessionToken) h["X-Session-Token"] = auth.user.currentSessionToken;
    return h;
  }, []);

  /**
   * Real fingerprint hardware SDK plugs in here.
   *
   * Deterministic per person so a demo registration (same base signature)
   * can actually verify. "Force failure" dev mode returns a wrong signature.
   * Swap for `await fingerprintScanner.capture()` when hardware arrives.
   */
  const captureSignature = useCallback(
    () => (forceFail ? `wrong_sig:${personId}` : `sig:${personId}`),
    [personId, forceFail]
  );

  const runVerify = useCallback(async () => {
    if (runningRef.current || !isOpen) return;
    runningRef.current = true;
    setStatus("scanning");
    setMessage(`Verifying thumbprint for ${personName}...`);

    try {
      const signature = captureSignature();
      const attempt = attemptRef.current + 1;

      const res = await fetch("/api/gate/verify-thumbprint", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ personId, signature, clientEventId: `scan_${Date.now()}`, attempt }),
      });

      const result = await res.json().catch(() => null);

      if (res.status === 401 && (result?.error?.code === "SESSION_EXPIRED" || result?.error?.code === "UNAUTHORIZED")) {
        const auth = useAuthStore.getState();
        auth.logout();
        if (typeof window !== "undefined") window.location.href = "/login";
        return;
      }

      if (!result?.success) {
        throw new Error(result?.error?.message || "Verification request failed");
      }

      const { verified, code } = result.data ?? {};

      if (verified) {
        setStatus("success");
        setMessage("Thumbprint matched. Identity confirmed.");
        return;
      }

      if (code === "NO_THUMBPRINT") {
        setStatus("no_record");
        setMessage("No thumbprint is registered for this person in the database.");
        return;
      }

      // INVALID_THUMBPRINT
      attemptRef.current += 1;
      const next = attemptRef.current;
      setAttempts(next);
      const remaining = maxAttempts - next;
      if (remaining <= 0) {
        setStatus("failed");
        setMessage("Maximum attempts exceeded. Access denied.");
        setTimeout(() => onResult({ verified: false }), 1500);
      } else {
        setStatus("failed");
        setMessage(`Thumbprint did not match. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
      }
    } catch (err) {
      setStatus("failed");
      setMessage(err instanceof Error ? err.message : "Network error during verification.");
    } finally {
      runningRef.current = false;
    }
  }, [isOpen, personId, personName, authHeaders, captureSignature, onResult]);

  // The parent conditionally renders this component (unmounts it when closed)
  // and keys it by personId, so internal state is always fresh on mount — no
  // manual reset effect is needed.

  // Auto-start the scan shortly after the dialog opens.
  useEffect(() => {
    if (isOpen && status === "idle") {
      const t = setTimeout(runVerify, 400);
      return () => clearTimeout(t);
    }
  }, [isOpen, status, runVerify]);

  if (!isOpen) return null;

  const processing = status === "idle" || status === "scanning";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pb-safe select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-8 max-w-md w-full shadow-xl"
        >
          <div className="text-center space-y-6">
            {/* Dev-only toggle: force every verification to fail (no SQL needed). */}
            {isDev && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-left">
                <label className="flex items-center gap-2 text-xs font-medium text-amber-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceFail}
                    onChange={(e) => setForceFail(e.target.checked)}
                    className="accent-amber-400 w-4 h-4"
                  />
                  🔧 Dev Mode: Force Failure
                </label>
                <p className="text-[10px] text-amber-400/70 mt-1">
                  When enabled, thumbprint verification will always fail.
                </p>
              </div>
            )}

            {/* Icon */}
            <div className="flex justify-center">
              <div
                className={`
                  w-24 h-24 rounded-full flex items-center justify-center border
                  ${status === "success" ? "bg-emerald-500/15 border-emerald-500/30" :
                    status === "no_record" ? "bg-amber-500/15 border-amber-500/30" :
                    status === "failed" ? "bg-rose-500/15 border-rose-500/30" :
                    "bg-blue-500/15 border-blue-500/30 animate-pulse"}
                `}
              >
                {status === "success" && <CheckCircle2 className="w-12 h-12 text-emerald-400" />}
                {status === "no_record" && <ShieldAlert className="w-12 h-12 text-amber-400" />}
                {status === "failed" && <XCircle className="w-12 h-12 text-rose-400" />}
                {(status === "idle" || status === "scanning") && (
                  <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                {status === "no_record" && "Thumbprint Not in Database"}
                {status === "success" && "Biometric Verified!"}
                {status === "failed" && "Verification Failed"}
                {processing && "Verifying Thumbprint"}
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {processing && `Place your thumb on the scanner for ${personName}.`}
                {status === "no_record" && "This person has no thumbprint on file. You may continue with photo verification."}
                {status === "success" && `Identity confirmed for ${personName}.`}
                {status === "failed" && message}
              </p>
              {personUniqueId && (
                <p className="text-[10px] font-mono font-semibold text-emerald-400 mt-1">
                  {personUniqueId}
                </p>
              )}
            </div>

            {/* Attempt counter */}
            {status === "failed" && (
              <div className="text-xs text-[var(--text-muted)]">
                Attempt {attempts} of {maxAttempts}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
              {status === "failed" && attempts < maxAttempts && (
                <button
                  onClick={runVerify}
                  className="flex-1 py-3 rounded-xl bg-[var(--action-primary)] text-white font-semibold hover:opacity-90 transition"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={() => {
                  if (status === "success") onResult({ verified: true, code: "VERIFIED" });
                  else if (status === "no_record") onResult({ verified: false, fallback: true, code: "NO_THUMBPRINT" });
                  else onCancel();
                }}
                className={`
                  ${(status === "failed" && attempts < maxAttempts) || status === "success" || status === "no_record" ? "flex-1" : "w-full"}
                  py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)]
                  font-semibold hover:bg-[var(--bg-elevated)] transition
                `}
              >
                {status === "success" && "Continue"}
                {status === "no_record" && "Continue without biometric"}
                {status === "failed" && attempts < maxAttempts && "Cancel"}
                {(status === "idle" || status === "scanning" || (status === "failed" && attempts >= maxAttempts)) && "Cancel"}
              </button>
            </div>

            {/* Security note */}
            <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">
              Thumbprint signatures are hashed server-side with bcrypt. Raw biometric data is never stored.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}