/**
 * shared/profile/RecordsSection.tsx — the "My Records" aggregate view.
 * Ties every feature together into one profile tab: attendance %,
 * passes used, meals attended + avg rating, events, achievements,
 * complaints, documents. With PDF export + share-with-parent.
 *
 * This is the aggregation step: the cross-links from Part 5 resolve
 * here, not in each silo.
 */

"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/utils";

interface Records {
  attendance?: { pct: number; period: string };
  passes?: { used: number; total: number; avgApprovalHours: number };
  meals?: { attended: number; total: number; avgRating: number };
  events?: { attended: number; upcoming: number };
  achievements?: { unlocked: number; inProgress: number };
  complaints?: { open: number; resolved: number; avgRating: number };
  documents?: { verified: number; pending: number };
}

export interface RecordsSectionProps {
  /** The records to display. When omitted, the section fetches them. */
  records?: Records;
  /** Period label (default "this month"). */
  periodLabel?: string;
  className?: string;
}

export function RecordsSection({ records: recordsProp, periodLabel = "this month", className }: RecordsSectionProps) {
  const [records, setRecords] = useState<Records>(recordsProp ?? {});
  const [loading, setLoading] = useState(!recordsProp);

  useEffect(() => {
    if (recordsProp) {
      setRecords(recordsProp);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/records/me", { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.records) setRecords(data.records);
      } catch {
        // graceful degradation
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recordsProp]);

  const exportPdf = async () => {
    const res = await fetch("/api/records/me/export", {
      headers: getAuthHeaders(),
      method: "POST",
      body: JSON.stringify({ format: "pdf" }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-records.pdf";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 p-4 text-xs text-text-muted", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your records…
      </div>
    );
  }

  const cards: { label: string; value: string; detail?: string }[] = [];
  if (records.attendance) cards.push({ label: "Attendance", value: `${records.attendance.pct}%`, detail: periodLabel });
  if (records.passes) cards.push({ label: "Passes", value: `${records.passes.used}/${records.passes.total}`, detail: `avg ${records.passes.avgApprovalHours}h approval` });
  if (records.meals) cards.push({ label: "Meals", value: `${records.meals.attended}/${records.meals.total}`, detail: `avg rating ${records.meals.avgRating}` });
  if (records.events) cards.push({ label: "Events", value: String(records.events.attended), detail: `${records.events.upcoming} upcoming` });
  if (records.achievements) cards.push({ label: "Achievements", value: String(records.achievements.unlocked), detail: `${records.achievements.inProgress} in progress` });
  if (records.complaints) cards.push({ label: "Complaints", value: String(records.complaints.open), detail: `${records.complaints.resolved} resolved` });
  if (records.documents) cards.push({ label: "Documents", value: String(records.documents.verified), detail: `${records.documents.pending} pending` });

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">My Records</h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={exportPdf}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:bg-bg-elevated"
          >
            <Download className="h-3 w-3" />
            PDF
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:bg-bg-elevated"
          >
            <Share2 className="h-3 w-3" />
            Share
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="text-xs text-text-muted">No records yet for {periodLabel}.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cards.map((c) => (
            <div key={c.label} className="surface-card p-3">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">{c.label}</p>
              <p className="text-lg font-bold text-text">{c.value}</p>
              {c.detail && <p className="text-[10px] text-text-muted">{c.detail}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecordsSection;
