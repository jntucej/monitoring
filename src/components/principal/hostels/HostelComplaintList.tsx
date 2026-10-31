"use client";

import { MessageSquare, Building2 } from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export interface ComplaintItem {
  id: string;
  complaintNumber: string;
  categoryCode: string;
  categoryLabel: string;
  title: string;
  priority: string;
  status: string;
  currentOwnerRole: string;
  slaDeadline: string | null;
  createdAt: string;
}

/**
 * HostelComplaintList — hostel-related complaints fetched from /api/complaints.
 * Filters to hostel domain.
 */
export function HostelComplaintList() {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/complaints?status=submitted&category=hostel");
      const json = await res.json();
      setComplaints(json.data?.complaints ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, { intervalMs: 60_000 });

  return (
    <PrincipalWidgetBoundary title="Hostel Complaints">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Hostel Complaints</span>
          {complaints.length > 0 && (
            <span className="text-xs text-amber-400 ml-auto">{complaints.length} open</span>
          )}
        </div>

        {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

        {loading && complaints.length === 0 ? (
          <div className="space-y-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : complaints.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-3 text-center">No hostel complaints pending.</p>
        ) : (
          <ul className="space-y-2 min-w-0">
            {complaints.slice(0, 10).map((c) => (
              <li key={c.id} className="min-w-0">
                <Link
                  href={`/principal/operations/incidents`}
                  className="block p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-[var(--text-muted)] shrink-0">{c.complaintNumber}</span>
                    <span className="text-xs text-[var(--text-primary)] truncate">{c.title}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${
                        c.priority === "high"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {c.priority}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {c.categoryLabel} · {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PrincipalWidgetBoundary>
  );
}
