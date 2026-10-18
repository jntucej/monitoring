"use client";
import { useEffect, useState } from "react";
import { FileText, Download, BarChart3, Loader2, ClipboardList, Clock } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import type { DashboardData } from "@/lib/types";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageHeader } from "@/components/admin/shared/PageHeader";

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
  if (type === "Daily") return t.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  if (type === "Weekly") {
    const start = new Date(t);
    start.setDate(t.getDate() - 6);
    return `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${t.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  return t.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function downloadReportCSV(report: GeneratedReport, data: DashboardData | null) {
  if (!data) return;
  const rows: string[] = [
    ["Date", report.range].join(","),
    ["Type", report.type].join(","),
    ["Generated", report.generatedAt].join(","),
  ];
  const dump = () => {
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report-${report.id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  dump();
}

/**
 * SysAdmin Reports — ported from the admin console so the root operator can
 * generate and download Daily/Weekly/Monthly campus reports.
 */
export default function SysAdminReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [reports, setReports] = useState<GeneratedReport[]>([]);

  useEffect(() => {
    fetch("/api/admin/dashboard", { headers: getAuthHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (!j) return;
        setData((j.data ?? j) as DashboardData);
      })
      .catch(() => {});
  }, []);

  const generate = (type: GeneratedReport["type"]) => {
    const r: GeneratedReport = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      title: `${type} Campus Report`,
      range: rangeFor(type),
      type,
      generatedAt: new Date().toISOString(),
      source: "manual",
    };
    setReports((prev) => [r, ...prev].slice(0, 20));
    downloadReportCSV(r, data);
  };

  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Reports" subtitle="Generate and download campus reports" />

        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--action-primary)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Generate report</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => generate(t)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-surface)]/60"
              >
                <BarChart3 className="w-3.5 h-3.5" /> {t}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[var(--action-info)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Recent reports</h2>
          </div>
          {reports.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No reports generated this session.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{r.title}</p>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {r.range} · {new Date(r.generatedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadReportCSV(r, data)}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-surface)]/60"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
