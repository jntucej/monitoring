"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Clock } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface PolicyRow {
  id: string;
  name: string;
  ttl_days: number | null;
  applies_to: string | null;
  is_active: boolean;
  last_run_at: string | null;
  last_runs?: Array<{ status: string; run_at: string; items_deleted: number }>;
}

/**
 * Sysadmin Retention Policies — data-retention policy list (read-only view).
 * Backend: /api/admin/retention-policies (sysadmin scope; GET-only from UI).
 */
function SysadminRetentionInner() {
  const [rows, setRows] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/retention-policies", { headers: getAuthHeaders() });
      const body = await res.json();
      setRows((body?.data ?? []) as PolicyRow[]);
    } catch (e) {
      console.error("retention-policies", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Retention Policies"
        subtitle="Data-retention and de-provisioning policy definitions"
        onRefresh={load}
      />

      <WidgetBoundary title="Policies">
        <div className="glass-card">
          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[var(--text-muted)]">No retention policies configured.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{r.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${r.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}>
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {r.ttl_days ? `TTL: ${r.ttl_days} days` : "No TTL"}
                      {r.applies_to ? ` · applies to ${r.applies_to}` : ""}
                    </p>
                    {r.last_run_at && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">
                        Last run: {new Date(r.last_run_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Retention run log">
        <SectionCard
          title="Retention runs"
          description="Recent retention policy execution results"
          icon={FileText}
          iconTone="default"
        >
          <p className="text-sm text-[var(--text-secondary)]">
            Retention runs are executed on the schedule defined in the policy. Each run
            de-provisions or deletes records past their TTL. Run history is recorded in the
            audit log.
          </p>
        </SectionCard>
      </WidgetBoundary>
    </div>
  );
}

export default function SysadminRetentionPoliciesPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <SysadminRetentionInner />
    </AuthGuard>
  );
}
