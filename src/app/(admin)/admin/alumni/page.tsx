"use client";

import { useCallback, useEffect, useState } from "react";
import { usePersistentQuery } from "@/hooks/usePersistentQuery";
import { GraduationCap, Search, RefreshCw, ChevronRight } from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { EntityInspector, KVPairs, InspectorButton } from "@/components/shared/EntityInspector";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

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
  const [query, setQuery] = usePersistentQuery("gate-admin-alumni-query");
  const [active, setActive] = useState<AlumniRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/students?${query ? `q=${encodeURIComponent(query)}` : ""}`,
        { headers: getAuthHeaders() },
      );
      const body = await res.json();
      const raw = body?.data ?? body ?? [];
      const all = (Array.isArray(raw) ? raw : []) as AlumniRow[];
      setRows(all.filter((r) => r.status === "DEPROVISIONED"));
    } catch (e) {
      console.error("alumni", e);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, query ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Graduated and checked-out students"
        contextLabel="Graduated and checked-out students"
        statusSummary="Review current graduated and checked-out students state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
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
          <div className="surface-card p-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search alumni by name / roll / email…"
                className="surface-card w-full pl-9 pr-3 py-2.5 bg-bg-elevated text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary/30"
              />
            </div>
            <button onClick={load} className="text-text-muted hover:text-text-primary">
              <RefreshCw className="w-4 h-4" />
            </button>
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
                  <tr className="text-xs text-text-muted border-b border-border">
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Dept</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Checked out</th>
                    <th aria-label="Inspect" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setActive(r)}
                      className="hover:bg-bg-elevated/40 cursor-pointer"
                    >
                      <td className="p-3 font-semibold text-text-primary">{r.name}</td>
                      <td className="p-3 font-mono text-xs text-text-muted">{r.uniqueId ?? r.id}</td>
                      <td className="p-3 text-xs text-text-muted">{r.department ?? "—"}</td>
                      <td className="p-3 font-mono text-xs text-text-muted">{r.email ?? "—"}</td>
                      <td className="p-3 text-xs text-text-muted">
                        {r.checkedOutAt
                          ? new Date(r.checkedOutAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="p-3 text-text-muted"><ChevronRight className="w-4 h-4" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <EntityInspector
        inspection={
          active
            ? {
                kind: "student",
                title: active.name,
                subtitle: active.uniqueId ?? active.id,
                status: (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-action-danger">
                    DEPROVISIONED
                  </span>
                ),
                sections: [
                  {
                    title: "Overview",
                    content: (
                      <KVPairs
                        items={[
                          { label: "Department", value: active.department ?? "—" },
                          ...(active.year ? [{ label: "Year", value: String(active.year) }] : []),
                          ...(active.email ? [{ label: "Email", value: active.email }] : []),
                          {
                            label: "Checked out",
                            value: active.checkedOutAt
                              ? new Date(active.checkedOutAt).toLocaleDateString("en-IN")
                              : "—",
                          },
                        ]}
                      />
                    ),
                  },
                  {
                    title: "Actions",
                    content: (
                      <div className="flex flex-wrap gap-2">
                        <InspectorButton
                          href={`/admin/students/${active.id}`}
                          variant="primary"
                        >
                          <ChevronRight className="size-3.5" /> Full record
                        </InspectorButton>
                      </div>
                    ),
                  },
                ],
                detailHref: `/admin/students/${active.id}`,
                detailLabel: "View full profile",
              }
            : null
        }
        onClose={() => setActive(null)}
      />
    </div>
  );
}

export default function AdminAlumniPage() {
  return (
    <AdminAlumniInner />
  );
}
