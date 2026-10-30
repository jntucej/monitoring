"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Delete, ArrowRight, AlertCircle, Shield, Lock, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import type { Role } from "@/lib/types";

function KioskPinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gateIdParam = searchParams.get("gateId");

  const [pin, setPin] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState<boolean>(false);

  const handleDigit = useCallback((digit: string) => {
    setError(null);
    setPin((prev) => (prev.length < 6 ? prev + digit : prev));
  }, []);

  const handleBackspace = useCallback(() => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setError(null);
    setPin("");
  }, []);

  const submitPin = useCallback(async (pinToSubmit: string) => {
    if (pinToSubmit.length !== 6 || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/operator/kiosk-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pinToSubmit,
          gateId: gateIdParam || undefined,
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        const { accessToken, operator: opInfo, gateId: sessionGateId } = json.data;
        if (accessToken && opInfo) {
          const userObj = {
            id: String(opInfo.id ?? ""),
            uniqueId: (opInfo.uniqueId ?? opInfo.unique_id) as string,
            name: String(opInfo.name ?? "Kiosk Operator"),
            role: (opInfo.role as Role) ?? "operator",
            gateId: sessionGateId || gateIdParam || undefined,
            status: "ACTIVE" as any,
          };

          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("auth.token", accessToken);
          }

          useAuthStore.setState({
            token: accessToken,
            authenticated: true,
            role: userObj.role,
            user: userObj,
          });

          // Redirect to the gate scan desk
          const dest = sessionGateId || gateIdParam ? `/gate/${sessionGateId || gateIdParam}` : "/operator/claim";
          router.push(dest);
          return;
        }
      }

      // Handle failures
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin("");

      if (res.status === 429) {
        setError("Too many failed attempts. Please wait 60 seconds.");
      } else if (res.status === 403) {
        setError("Incorrect Operator PIN. Please try again.");
      } else {
        setError(json?.error?.message || "Invalid PIN. Authentication rejected.");
      }
    } catch {
      setError("Network or connection error. Please try again.");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  }, [gateIdParam, router, submitting]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        handleClear();
      } else if (e.key === "Enter" && pin.length === 6) {
        submitPin(pin);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit, handleBackspace, handleClear, submitPin, pin]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (pin.length === 6 && !submitting) {
      submitPin(pin);
    }
  }, [pin, submitting, submitPin]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 select-none">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Kiosk Operator PIN</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Enter your 6-digit security PIN to unlock this gate terminal
            {gateIdParam ? ` (${gateIdParam})` : ""}.
          </p>
        </div>

        {/* PIN Indicators */}
        <div
          className={`flex items-center justify-center gap-3 py-2 ${
            shake ? "animate-[shake_0.5s_ease-in-out]" : ""
          }`}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const filled = i < pin.length;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  filled
                    ? "bg-[var(--action-primary)] border-[var(--action-primary)] scale-110 shadow-sm"
                    : "border-[var(--border-strong)] bg-transparent"
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-center gap-2 text-center animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={submitting}
              onClick={() => handleDigit(String(num))}
              className="h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xl font-bold text-[var(--text-primary)] hover:bg-[var(--bg-base)] active:scale-95 transition flex items-center justify-center shadow-xs"
            >
              {num}
            </button>
          ))}

          {/* Bottom row: Clear, 0, Backspace */}
          <button
            type="button"
            disabled={submitting || pin.length === 0}
            onClick={handleClear}
            className="h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] active:scale-95 transition flex items-center justify-center disabled:opacity-40"
          >
            Clear
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleDigit("0")}
            className="h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xl font-bold text-[var(--text-primary)] hover:bg-[var(--bg-base)] active:scale-95 transition flex items-center justify-center shadow-xs"
          >
            0
          </button>

          <button
            type="button"
            disabled={submitting || pin.length === 0}
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] active:scale-95 transition flex items-center justify-center disabled:opacity-40"
            aria-label="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Loading Spinner */}
        {submitting && (
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--action-primary)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying operator PIN…</span>
          </div>
        )}

        {/* Footer Link */}
        <div className="pt-2 border-t border-[var(--border)] text-center">
          <Link
            href="/login"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            Switch to username & password login →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function KioskPinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[var(--action-primary)] animate-spin" />
        </div>
      }
    >
      <KioskPinInner />
    </Suspense>
  );
}
