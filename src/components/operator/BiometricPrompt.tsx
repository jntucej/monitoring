"use client";

// Biometric step for high-risk OUT scans (home_out with a valid pass).
//
// HARDWARE NOTE: the signature <Input> below is the integration point for
// the kiosk's fingerprint reader. Swap it for one of:
//   - WebAuthn: navigator.credentials.get({ publicKey: { challenge,
//     allowCredentials, userVerification: "required" } }) and base64 the
//     assertion's signature field;
//   - serial-port SDK: subscribe to the reader's data event and call
//     setSignature(data) on receipt;
//   - keyboard-wedge reader: keep the <Input> as-is.
// The server endpoint (/api/gate/verify-thumbprint) is unchanged.
//
// If no reader exists on the kiosk yet, leave this component in place but
// keep the requireBiometric gate in the desk commented out — a dead button
// is worse than no button. The biometric flow is not load-bearing today.

import { useCallback, useState } from "react";
import { Fingerprint, Loader2, ShieldQuestion } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getAuthHeaders } from "@/lib/utils";

export type BiometricPromptProps = {
  ticketNumber: string;
  roll: string;
  /** "thumb" = fingerprint reader; "pin" = operator PIN fallback. */
  mode?: "thumb" | "pin";
  onCancel: () => void;
  onVerified: () => void;
};

type VerifyResult = "checking" | "ok" | "mismatch" | "error" | null;

export function BiometricPrompt({
  ticketNumber,
  roll,
  mode = "thumb",
  onCancel,
  onVerified,
}: BiometricPromptProps) {
  const [signature, setSignature] = useState("");
  const [result, setResult] = useState<VerifyResult>(null);
  const [busy, setBusy] = useState(false);

  const verify = useCallback(async () => {
    if (!signature.trim()) return;
    setBusy(true);
    setResult("checking");
    try {
      const res = await fetchWithTimeout(
        "/api/gate/verify-thumbprint",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ roll, ticket_number: ticketNumber, signature }),
        },
        10_000,
      );
      const json = await res.json().catch(() => null);
      if (res.ok && json?.match === true) {
        setResult("ok");
        onVerified();
      } else {
        setResult(json?.match === false ? "mismatch" : "error");
      }
    } catch {
      setResult("error");
    } finally {
      setBusy(false);
    }
  }, [signature, roll, ticketNumber, onVerified]);

  const caption =
    result === "mismatch"
      ? "Fingerprint did not match the registered print. Try again, or escalate."
      : result === "error"
        ? "Could not reach the biometric verifier. Retry or escalate."
        : result === "ok"
          ? "Verified — recording the scan."
          : `Place the student's finger on the reader (ticket ${ticketNumber}).`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Biometric verification"
      className="fixed inset-x-0 bottom-0 z-80 mx-auto w-full max-w-md p-4"
    >
      <div className="surface-card bg-bg-surface p-4">
        <div className="flex items-center gap-2">
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-action-primary" aria-hidden />
          ) : (
            <Fingerprint className="h-5 w-5 text-action-primary" aria-hidden />
          )}
          <h3 className="text-sm font-bold text-text-primary">
            Thumbprint required
          </h3>
          <ShieldQuestion className="ml-auto h-4 w-4 text-text-muted" aria-hidden />
        </div>
        <p className="mt-2 text-xs text-text-secondary">{caption}</p>

        {mode === "thumb" && (
          <div className="mt-3">
            <Input
              label="Reader signature"
              value={signature}
              onChange={(e) => {
                setSignature(e.target.value);
                if (result !== null) setResult(null);
              }}
              placeholder="Tap the fingerprint reader…"
              disabled={busy}
              autoFocus
            />
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={verify}
            disabled={busy || !signature.trim() || result === "checking"}
          >
            {busy ? "Verifying…" : "Verify"}
          </Button>
        </div>
      </div>
    </div>
  );
}
