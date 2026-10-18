"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays, Loader2, RefreshCw,
} from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number | null;
  registrations: number;
}

/**
 * Admin Campus Events — upcoming campus events + registration counts.
 * Backend: /api/campus/events (open GET).
 */
function AdminEventsInner() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campus/events", { headers: getAuthHeaders() });
      const body = await res.json();
      setRows((body?.data?.events ?? []) as EventRow[]);
    } catch (e) {
      console.error("events", e);
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
        title="Campus Events"
        subtitle="Upcoming campus events and registration volume"
        onRefresh={load}
      />

      <WidgetBoundary title="Events">
        <div className="glass-card">
          {rows.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-6 h-6" />}
              title="No events scheduled"
              description="Campus events appear here once they are published."
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{r.title}</p>
                      {r.category && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/20 text-[var(--action-primary)]">{r.category}</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {r.location ? `${r.location} · ` : ""}
                      {r.startsAt ? new Date(r.startsAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                    {r.description && <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2">{r.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[var(--text-muted)]">{r.registrations}/{r.capacity ?? "∞"} registered</p>
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

export default function AdminEventsPage() {
  return (
    
      <AdminEventsInner />
    
    

  );
}
