"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, ShieldCheck, AlertTriangle } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface ConsentStats { scope: string; granted: number; revoked: number; total: number }

function SysadminConsentInner() {
  const [stats, setStats] = useState<ConsentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/consent/stats", {
        headers: getAuthHeaders(), cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false) {
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      setStats(Array.isArray(body?.data) ? body.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load consent statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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
        onRefresh={load}
      />
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      <WidgetBoundary title="Consent by scope">
        <SectionCard
          title="Recorded consent"
          description="Scope-level counts from the consent_records ledger"
          icon={ShieldCheck}
          iconTone="accent"
        >
          {stats.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No consent records yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {stats.map((s) => (
                <div key={s.scope} className="p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{s.scope}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {s.granted} active · {s.revoked} revoked · {s.total} total
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/20 text-[11px] text-[var(--action-primary)]">
                    {s.total > 0 ? `${Math.round((s.granted / s.total) * 100)}% active` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
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
              { cat: "Gate movement logs",   scope: "All enrolled students",          retention: "Session + 30 days" },
              { cat: "Biometric templates",  scope: "Students with biometric enrolled", retention: "Active + 90 days" },
              { cat: "Attendance records",   scope: "All enrolled students",          retention: "Academic year + 1 year" },
              { cat: "Support tickets",      scope: "All users",                      retention: "2 years post-resolution" },
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
