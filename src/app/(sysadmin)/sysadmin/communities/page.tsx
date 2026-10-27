"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users, ShieldCheck,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface CommunityRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_moderated: boolean;
  created_at: string | null;
  memberCount?: number;
}

/**
 * Sysadmin Communities — community list + moderation status.
 * Backend: /api/campus/communities (admin|sysadmin read scope).
 */
function SysadminCommunitiesInner() {
  const [rows, setRows] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campus/communities", { headers: getAuthHeaders() });
      const body = await res.json();
      setRows((body?.data?.communities ?? []) as CommunityRow[]);
    } catch (e) {
      console.error("communities", e);
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
        title="Communities"
        subtitle="Campus communities and moderation status"
        onRefresh={load}
      />

      <WidgetBoundary title="Communities">
        <div className="glass-card">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="No communities found"
              description="Communities appear here once they are created."
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                    {r.icon ? <span className="text-lg">{r.icon}</span> : <Users className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{r.name}</p>
                      {r.is_moderated && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Moderated
                        </span>
                      )}
                      {typeof r.memberCount === "number" && (
                        <span className="text-xs text-[var(--text-muted)]">{r.memberCount} members</span>
                      )}
                    </div>
                    {r.description && <p className="text-xs text-[var(--text-secondary)] mt-1">{r.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function SysadminCommunitiesPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <SysadminCommunitiesInner />
    </AuthGuard>
  );
}
