"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { useState, useCallback } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";
import Link from "next/link";

function PasswordPageInner() {
  const addToast = useUIStore((s) => s.addToast);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (next.length < 8) {
        addToast({ message: "New password must be at least 8 characters.", variant: "error" });
        return;
      }
      if (next !== confirm) {
        addToast({ message: "Passwords do not match.", variant: "error" });
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ currentPassword: current, newPassword: next }),
        });
        const json = await res.json();
        if (json.success) {
          addToast({ message: "Password updated successfully.", variant: "success" });
          setCurrent("");
          setNext("");
          setConfirm("");
        } else {
          addToast({ message: json.error?.message || "Failed to change password.", variant: "error" });
        }
      } catch (err: unknown) {
        addToast({ message: err instanceof Error ? err.message : "Network error", variant: "error" });
      } finally {
        setSubmitting(false);
      }
    },
    [current, next, confirm, addToast],
  );

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <Link
        href="/principal/profile"
        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        ← Back to profile
      </Link>

      <h1 className="text-xl font-bold text-[var(--text-primary)]">Change Password</h1>

      <PrincipalWidgetBoundary title="Update Credentials">
        <form onSubmit={submit} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 space-y-3 max-w-md">
          <div>
            <label htmlFor="pw-current" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                id="pw-current"
                type={showPw ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="pw-next" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              New Password
            </label>
            <input
              id="pw-next"
              type={showPw ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="pw-confirm" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Confirm New Password
            </label>
            <input
              id="pw-confirm"
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5" />
            {submitting ? "Updating…" : "Update Password"}
          </button>
        </form>
      </PrincipalWidgetBoundary>
    </div>
  );
}

export default function PasswordPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <PasswordPageInner />
    </Suspense>
  );
}
