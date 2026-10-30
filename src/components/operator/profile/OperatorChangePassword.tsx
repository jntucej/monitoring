"use client";

// src/components/operator/profile/OperatorChangePassword.tsx
// Operator-specific copy of @/components/shared/ChangePasswordCard

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useApi } from "@/hooks/useApi";

export function OperatorChangePasswordCard() {
  const api = useApi();
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validate = (): string | null => {
    if (!current || !next || !confirm) return "All fields are required.";
    if (next.length < 8) return "New password must be at least 8 characters.";
    if (next.length > 128) return "New password must be at most 128 characters.";
    if (next !== confirm) return "New passwords do not match.";
    if (next === current) return "New password must be different from current password.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const localError = validate();
    if (localError) {
      setError(localError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...api.getHeaders(),
        },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
        }),
      });

      // Session invalidation may land as 401 — treat success only for 2xx.
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401 && !payload?.error) {
          setError("Session expired. Please sign in again.");
        } else {
          setError(payload?.error || "Could not change password.");
        }
        return;
      }

      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      // The rotation just cleared the server-side password_must_change flag;
      // clear the client-side copy so the redirect target is the normal
      // dashboard (or login page) instead of the forced-change flow again.
      setMustChangePassword(false);

      // Server bumped session_version → every token is now stale.
      // Give the user a moment to read the confirmation, then sign out.
      setTimeout(async () => {
        await logout();
        router.replace("/login?changed=1");
      }, 1800);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
      {mustChangePassword && !success && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">A temporary password was set for your account.</p>
            <p className="mt-0.5 text-amber-200/80">
              You must choose a new password now — the one an administrator or the
              enrollment process set for you is valid until you replace it.
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-xl bg-[var(--action-primary)]/10">
          <KeyRound className="w-5 h-5 text-[var(--action-primary)]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Change password</h3>
          <p className="text-sm text-[var(--text-muted)]">
            You will be signed out of all devices after this change.
          </p>
        </div>
      </div>

      {success ? (
        <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Password changed successfully.
            </p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
              Signing you out…
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <OperatorPasswordField
            label="Current password"
            value={current}
            onChange={setCurrent}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            autoComplete="current-password"
          />
          <OperatorPasswordField
            label="New password"
            value={next}
            onChange={setNext}
            show={showNext}
            onToggle={() => setShowNext((v) => !v)}
            autoComplete="new-password"
            hint="At least 8 characters."
          />
          <OperatorPasswordField
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            autoComplete="new-password"
          />

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--action-primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 transition"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Update password
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

interface OperatorPasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  hint?: string;
}

function OperatorPasswordField({
  label, value, onChange, show, onToggle, autoComplete, hint,
}: OperatorPasswordFieldProps) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
        {label}
      </span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2.5 pr-10 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)]/40"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-2 flex items-center px-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
    </label>
  );
}
