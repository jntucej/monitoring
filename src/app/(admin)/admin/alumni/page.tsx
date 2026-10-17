"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GraduationCap, Search, Loader2, RefreshCw,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface AlumniRow {
  id: string;
  name: string;
  uniqueId: string | null;
  email: string | null;
  status: string;
  department: string | null;
  year?: number | null;
  checkedOutAt?: string | null;
}

/**
 * Admin Alumni — graduated / checked-out students.
 * Backend: /api/students?status=DEPROVISIONED (admin|sysadmin scope).
 */
function AdminAlumniInner() {
  const [rows, setRows] = useState<AlumniRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = q
        ? `q=${encodeURIComponent(q)}`
        : "status=DEPROVISIONED";
      const res = await fetch(`/api/students?${qs}`, { headers: getAuthHeaders() });
      const body = await res.json();
      setRows((body?.data ?? []) as AlumniRow[]);
    } catch (e) {
      console.error("alumni", e);
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
        title="Alumni"
        subtitle="Graduated and checked-out students"
        onRefresh={load}
      />

      <WidgetBoundary title="Alumni roster">
        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search alumni by name / roll / email…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]"
              />
            </div>
            <button onClick={load} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><RefreshCw className="w-4 h-4" /></button>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="w-6 h-6" />}
              title="No alumni found"
              description="De-provisioned students appear here once their account status changes."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Dept</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Checked out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-elevated)]/40">
                      <td className="p-3 font-semibold text-[var(--text-primary)]">{r.name}</td>
                      <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{r.uniqueId ?? r.id}</td>
                      <td className="p-3 text-xs text-[var(--text-muted)]">{r.department ?? "—"}</td>
                      <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{r.email ?? "—"}</td>
                      <td className="p-3 text-xs text-[var(--text-muted)]">
                        {r.checkedOutAt ? new Date(r.checkedOutAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function AdminAlumniPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <AdminAlumniInner />
    </AuthGuard>
  );
}
