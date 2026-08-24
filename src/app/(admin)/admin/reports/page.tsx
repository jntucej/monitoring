"use client";
import { useEffect, useState } from "react";
import { FileText, Download, BarChart3, Loader2 } from "lucide-react";
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
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
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

  const generate = (type: GeneratedReport["type"]) => {
    setBusy(type);
    setTimeout(() => {
      const rep: GeneratedReport = {
        id: `rpt-${Date.now()}`,
        title: `${type} Gate Activity Report`,
        range: rangeFor(type),
        type,
        generatedAt: new Date().toISOString(),
        source: "manual",
      };
      setGenerated((prev) => [rep, ...prev]);
      setBusy(null);
    }, 500);
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
        <h1 className="text-2xl font-bold">Reports</h1>
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
    </div>
  );
}
