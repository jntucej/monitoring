"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { FileText, Download, BarChart3, Loader2, ClipboardList, Clock } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import type { DashboardData } from "@/lib/types";
interface GeneratedReport {
  id: string;
  title: string;
  range: string;
  type: "Daily" | "Weekly" | "Monthly";
  generatedAt: string;
  source: "auto" | "manual";
}

const TYPES: GeneratedReport["type"][] = ["Daily", "Weekly", "Monthly"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function rangeFor(type: GeneratedReport["type"]): string {
  const t = new Date();
  if (type === "Daily") {
    return t.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (type === "Weekly") {
    const start = new Date(t);
    start.setDate(t.getDate() - 6);
    return `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${t.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  // Monthly
  return t.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function downloadReportCSV(report: GeneratedReport, data: DashboardData | null) {
  if (!data) return;
  const rows: string[] = [
    ["Date", report.range].join(","),
    ["Metric", "Value"].join(","),
    ["Total Students (on campus)", String(data.onCampus)].join(","),
    ["Total Scans (today)", String(data.totalScans)].join(","),
    ["Entries (today)", String(data.todayIn)].join(","),
    ["Exits (today)", String(data.todayOut)].join(","),
    ["Active Alerts", String(data.activeAlerts)].join(","),
    "",
    ["Department", "In", "Out", "% of Activity"].join(","),
    ...data.deptBreakdown.map((d) => [d.dept, d.in, d.out, `${d.pct}%`].join(",")),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.title.replace(/\s+/g, "_")}_${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState<GeneratedReport[]>([]);
  const [busy, setBusy] = useState<GeneratedReport["type"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/dashboard", { headers: getAuthHeaders(), cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          if (json.success) setData(json.data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load persisted generated reports so the list survives a refresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/reports?limit=20", { headers: getAuthHeaders(), cache: "no-store" });
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setGenerated(
            json.data.map((r: any) => ({
              id: r.id,
              title: r.title,
              range: r.range_label,
              type: r.type,
              generatedAt: r.created_at,
              source: r.source,
            }))
          );
        }
      } catch {
        /* fall back to in-memory only */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const generate = async (type: GeneratedReport["type"]) => {
    setBusy(type);
    const title = `${type} Gate Activity Report`;
    const range = rangeFor(type);

    // Snapshot the current dashboard numbers into the report so the CSV we
    // persist reflects the real data at generation time, not whatever the
    // dashboard happens to show later.
    const payload = data
      ? {
          onCampus: data.onCampus,
          totalScans: data.totalScans,
          todayIn: data.todayIn,
          todayOut: data.todayOut,
          activeAlerts: data.activeAlerts,
          deptBreakdown: data.deptBreakdown,
        }
      : null;
    const csvBody = payload
      ? [
          ["Date", range].join(","),
          ["Metric", "Value"].join(","),
          ["Total Students (on campus)", String(payload.onCampus)],
          ["Total Scans (today)", String(payload.totalScans)],
          ["Entries (today)", String(payload.todayIn)],
          ["Exits (today)", String(payload.todayOut)],
          ["Active Alerts", String(payload.activeAlerts)],
          "",
          ["Department", "In", "Out", "% of Activity"].join(","),
          ...payload.deptBreakdown.map((d) => [d.dept, d.in, d.out, `${d.pct}%`].join(",")),
        ].join("\n")
      : null;

    try {
      await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ title, range, type, source: "manual", csvBody, payload }),
      });
    } catch {
      /* persist best-effort; still show it in the session list */
    } finally {
      setGenerated((prev) => [
        { id: `rpt-${Date.now()}`, title, range, type, generatedAt: new Date().toISOString(), source: "manual" },
        ...prev,
      ]);
      setBusy(null);
    }
  };

  const exportAll = async () => {
    try {
      const res = await fetch(`/api/analytics/export?from=${todayISO()}&format=csv`);
      if (!res.ok) throw new Error("Failed to export report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gate_activity_report_${todayISO()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export report from server");
    }
  };

  const attendanceRate = data
    ? data.totalScans > 0
      ? Math.round((data.todayIn / (data.todayIn + Math.max(1, data.todayOut))) * 100)
      : 0
    : 0;

  return (
    
      <div className="space-y-6">
      <div>
        <p className="text-2xl font-bold">Reports</p>
        <p className="text-[var(--text-muted)]">Generate and download reports</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <BarChart3 className="w-6 h-6 text-[var(--action-primary)] mb-3" />
          <p className="text-2xl font-bold">{loading ? "—" : (data?.onCampus ?? 0).toLocaleString()}</p>
          <p className="text-sm text-[var(--text-muted)]">Students on Campus</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <BarChart3 className="w-6 h-6 text-[var(--action-info)] mb-3" />
          <p className="text-2xl font-bold">{loading ? "—" : (data?.totalScans ?? 0).toLocaleString()}</p>
          <p className="text-sm text-[var(--text-muted)]">Scans Today</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <BarChart3 className="w-6 h-6 text-[var(--action-warning)] mb-3" />
          <p className="text-2xl font-bold">{loading ? "—" : `${attendanceRate}%`}</p>
          <p className="text-sm text-[var(--text-muted)]">Activity Ratio (In/(In+Out))</p>
        </div>
      </div>

      {/* KPI summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <ClipboardList className="w-3.5 h-3.5 text-[var(--action-primary)]" /> Reports Generated
          </div>
          <div className="mt-1.5 text-xl font-black text-[var(--text-primary)] tabular-nums">{generated.length}</div>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Session reports (refresh resets)</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <Clock className="w-3.5 h-3.5 text-[var(--action-info)]" /> Last Export
          </div>
          <div className="mt-1.5 text-sm font-bold text-[var(--text-primary)]">
            {generated.length > 0
              ? new Date(generated[0].generatedAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "No exports this session"}
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{generated.length > 0 ? generated[0].title : "Export a report above"}</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <FileText className="w-3.5 h-3.5 text-[var(--action-warning)]" /> Export Formats
          </div>
          <div className="mt-1.5 text-sm font-bold text-[var(--text-primary)]">CSV</div>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">One-click download from report rows</p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--action-primary)]" />
            Available Reports
          </h3>
          <div className="flex gap-2 flex-wrap">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => generate(t)}
                disabled={busy !== null || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--bg-base)] border border-[var(--border)] hover:border-[var(--action-primary)] disabled:opacity-50"
              >
                {busy === t && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Generate {t}
              </button>
            ))}
            <button
              onClick={exportAll}
              disabled={loading || !data}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg bg-[var(--action-primary)] text-white hover:brightness-110 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {generated.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm">
              No reports generated yet. Click a button above to create one.
            </div>
          ) : (
            generated.map((report) => (
              <div key={report.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{report.title}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {report.range} • {new Date(report.generatedAt).toLocaleTimeString("en-IN")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-muted)]">
                    {report.type}
                  </span>
                  <button
                    onClick={() => downloadReportCSV(report, data)}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--action-primary)] hover:bg-white/5"
                    title="Download CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <DevContactStrip />
    </div>
    
    

  );
}
