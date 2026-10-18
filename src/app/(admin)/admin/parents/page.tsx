"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search, Loader2, Users, RefreshCw,
} from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface ParentRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  uniqueId: string | null;
  status: string;
  children: Array<{ id: string; roll: string; name: string; status: string }>;
}

/**
 * Admin Parents — guardian/parent roster with linked children.
 * Backend: /api/parents (admin|sysadmin scope).
 */
function AdminParentsInner() {
  const [rows, setRows] = useState<ParentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/parents?q=${encodeURIComponent(q)}`, { headers: getAuthHeaders() });
      const body = await res.json();
      setRows((body?.data ?? []) as ParentRow[]);
    } catch (e) {
      console.error("parents", e);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

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
        title="Parents & Guardians"
        subtitle={`${rows.length} guardian records with linked children`}
        onRefresh={load}
      />

      <WidgetBoundary title="Guardians">
        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search guardians by name / email / phone…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]"
              />
            </div>
            <button onClick={load} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><RefreshCw className="w-4 h-4" /></button>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="No guardians found"
              description="Guardians are linked to student records via their ID."
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{r.name}</p>
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-elevated)] text-[var(--text-muted)] uppercase tracking-wide">{r.status}</span>
                      {r.uniqueId && <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-elevated)] text-[var(--text-muted)] font-mono">{r.uniqueId}</span>}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.children.length === 0 && (
                        <span className="text-xs text-[var(--text-muted)]">No linked children</span>
                      )}
                      {r.children.map((c) => (
                        <span key={c.id} className="px-2 py-0.5 rounded-lg bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/20 text-[11px] text-[var(--action-primary)]">
                          {c.name} {c.roll ? `· ${c.roll}` : ""}
                        </span>
                      ))}
                    </div>
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

export default function AdminParentsPage() {
  return (
    
      <AdminParentsInner />
    
    

  );
}
