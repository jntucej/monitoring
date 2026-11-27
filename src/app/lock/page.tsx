"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ShieldAlert, Lock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import Link from "next/link";

function LockInner() {
  const params = useSearchParams();
  const token = params.get("t") ?? "";
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lock = async () => {
    if (!token) {
      setErr("This link is missing its token.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    setBusy(false);
    if (res && res.ok) setDone(true);
    else setErr("This link is invalid or has already been used.");
  };

  if (done) {
    return (
      <div className="p-6 sm:p-10 max-w-md mx-auto space-y-4">
        <BrandLogo variant="mark" size="sm" motion="cinematic" status="alert" className="mb-2" />
        <ContextSituationBar
          roleLabel="Account Security"
          purpose="Emergency killswitch to revoke all active web/mobile sessions."
          contextLabel="Account Killswitch"
          statusTone="critical"
          statusPill="Account Locked"
          statusSummary="All active sessions and tokens have been revoked. Password reset is required to regain access."
          primaryAction={{ label: "Go to Sign In", href: "/login" }}
          secondaryAction={{ label: "Contact Support", href: "/support" }}
        />
        <div className="surface-card bg-bg-surface p-6 space-y-3 border border-border">
          <div className="flex items-center gap-2 text-action-success">
            <CheckCircle2 className="w-5 h-5" />
            <h1 className="text-xl font-bold text-text-primary">Account locked</h1>
          </div>
          <p className="text-sm text-text-muted">
            All sessions have been revoked. Contact your administrator or support desk to unlock and re-verify your identity.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="surface-card inline-flex items-center gap-2 px-4 py-2 bg-action-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Back to login <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="p-6 sm:p-10 max-w-md mx-auto space-y-4">
        <BrandLogo variant="mark" size="sm" motion="cinematic" status="alert" className="mb-2" />
        <ContextSituationBar
          roleLabel="Account Security"
          purpose="Emergency killswitch to revoke all active web/mobile sessions."
          contextLabel="Account Killswitch"
          statusTone="warn"
          statusPill="Invalid Token"
          statusSummary="The lock link token could not be verified. It may have expired or already been activated."
          primaryAction={{ label: "Go to Sign In", href: "/login" }}
          secondaryAction={{ label: "Support", href: "/support" }}
        />
        <div className="surface-card bg-bg-surface p-6 space-y-3 border border-border">
          <div className="flex items-center gap-2 text-action-warning">
            <AlertTriangle className="w-5 h-5" />
            <h1 className="text-xl font-bold text-text-primary">Link invalid</h1>
          </div>
          <p className="text-sm text-text-muted">{err}</p>
          <div className="pt-2">
            <Link
              href="/login"
              className="surface-card inline-flex items-center gap-2 px-4 py-2 bg-bg-elevated text-text-primary text-xs font-semibold hover:bg-bg-elevated/80 transition-colors"
            >
              Sign In <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-6 sm:p-10 max-w-md mx-auto space-y-4">
      <ContextSituationBar
        roleLabel="Account Security"
        purpose="Emergency killswitch to revoke all active web/mobile sessions."
        contextLabel="Account Killswitch"
        statusTone="critical"
        statusPill="Emergency Lock"
        statusSummary="If you suspect compromised credentials or an unauthorized login, lock the account immediately."
        secondaryAction={{ label: "Sign In", href: "/login" }}
      />
      <div className="surface-card bg-bg-surface p-6 space-y-3 border border-border">
        <div className="flex items-center gap-2 text-action-danger">
          <ShieldAlert className="w-5 h-5" />
          <h1 className="text-xl font-bold text-text-primary">Lock your account</h1>
        </div>
        <p className="text-sm text-text-secondary">
          If someone else logged into your account or you notice suspicious gate pass activity, click below to immediately
          revoke all sessions.
        </p>
        <p className="text-xs text-text-muted">
          Locking disables RFID and dynamic QR credentials until an administrator verifies your identity.
        </p>
        <button
          onClick={lock}
          disabled={busy}
          className="mt-3 surface-card flex items-center justify-center gap-2 w-full rounded bg-action-danger px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Lock className="w-4 h-4" />
          {busy ? "Locking..." : "Lock account now"}
        </button>
      </div>
    </div>
  );
}

export default function LockPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LockInner />
    </Suspense>
  );
}
