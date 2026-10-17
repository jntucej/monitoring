"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, Lock, ShieldCheck } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

/**
 * Sysadmin Consent Management — gate / biometric consent policy view.
 * No dedicated read API yet; shows the policy framework + a link to the
 * biometric consent settings in the sysadmin security console.
 */
function SysadminConsentInner() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder: consent state is currently managed via the DB directly.
    // This page provides a policy framework view + a link to the security
    // console for the actual settings.
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Consent Management"
        subtitle="Data consent framework for biometric and gate access data"
      />

      <WidgetBoundary title="Consent policy">
        <SectionCard
          title="Biometric data consent"
          description="Governance rules for student biometric enrollment"
          icon={ShieldCheck}
          iconTone="accent"
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Biometric data (face, fingerprint) is collected at gate check-in for
              identity verification. Consent is implied by enrollment in a program
              and explicit revocation requires written request to the institution.
            </p>
            <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
              <strong className="text-[var(--text-secondary)]">Legal basis:</strong>{" "}
              Institutional enrollment consent · Data minimisation (biometric
              templates only; raw images discarded after match) · Retention
              tied to student active status + 90-day grace period
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Lock className="w-3.5 h-3.5" />
              Managed via sysadmin Security Console → Biometric Settings
            </div>
          </div>
        </SectionCard>
      </WidgetBoundary>

      <WidgetBoundary title="Consent framework">
        <SectionCard
          title="Access consent tiers"
          description="How consent is recorded and enforced per data category"
          icon={ScrollText}
          iconTone="default"
        >
          <div className="divide-y divide-[var(--border)]">
            {[
              { cat: "Gate movement logs", scope: "All enrolled students", retention: "Session + 30 days" },
              { cat: "Biometric templates", scope: "Enrolled students who enrolled biometrics", retention: "Active + 90 days" },
              { cat: "Attendance records", scope: "All enrolled students", retention: "Academic year + 1 year" },
              { cat: "Support tickets", scope: "All users", retention: "2 years post-resolution" },
            ].map((row) => (
              <div key={row.cat} className="p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{row.cat}</p>
                  <p className="text-xs text-[var(--text-muted)]">Scope: {row.scope}</p>
                </div>
                <span className="px-2 py-1 rounded-lg bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/20 text-[11px] text-[var(--action-primary)] shrink-0">
                  {row.retention}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </WidgetBoundary>
    </div>
  );
}

export default function SysadminConsentPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <SysadminConsentInner />
    </AuthGuard>
  );
}
