"use client";
import Link from "next/link";
import { Wrench, AlertTriangle, ArrowRight } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";

interface ComplaintRow { id?: string; status?: string; [k: string]: unknown; }
type ComplaintsData = ComplaintRow[] | { data?: { complaints?: ComplaintRow[] } };

function KpiTile({ label, value, tone = "ok" }: { label: string; value: string | number; tone?: "ok" | "warn" | "bad" }) {
  const toneClass = tone === "bad" ? "text-red-400" : tone === "warn" ? "text-amber-400" : "text-[var(--text-primary)]";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)] p-4 min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

export default function EmoLandingPage() {
  const { data } = useApiResource<ComplaintsData>("/api/complaints", { ttlMs: 60_000 });
  const rows = Array.isArray(data) ? data : Array.isArray((data as { data?: { complaints?: ComplaintRow[] } })?.data?.complaints)
    ? (data as { data?: { complaints?: ComplaintRow[] } }).data!.complaints!
    : [];
  const openBacklog = rows.filter((r) => !["resolved", "closed"].includes(String(r.status ?? "").toLowerCase())).length;

  return (
    <div className="p-4 sm:p-4 sm:p-6 max-w-3xl mx-auto space-y-4 sm:space-y-4 sm:space-y-6">
      <PageHeader title="Electrical Maintenance Officer" subtitle="Campus electrical and lab-power grievances (category D1)" />

      <WidgetBoundary name="EmoKpis" title="EMO KPIs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <KpiTile label="Assigned complaints" value={rows.length} />
          <KpiTile label="Open backlog" value={openBacklog} tone={openBacklog > 0 ? "warn" : "ok"} />
        </div>
      </WidgetBoundary>

      <Link
        href="/emo/complaints"
        className="group flex items-center justify-between rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-elev-1)] min-h-[44px]"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <div>
            <div className="font-semibold">Complaint Queue</div>
            <div className="text-xs text-[var(--text-muted)]">
              Power outages, UPS failures, lab wiring hazards
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--action-primary)]" />
      </Link>
      <Link
        href="/emo/complaints?status=resolved"
        className="group flex items-center justify-between rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-elev-1)] min-h-[44px]"
      >
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="font-semibold">Resolved</div>
            <div className="text-xs text-[var(--text-muted)]">
              Closed maintenance tickets
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--action-primary)]" />
      </Link>

      <WidgetBoundary name="ComplaintConsole" title="Complaint Console">
        <ComplaintConsole role="emo" basePath="/emo/complaints" />
      </WidgetBoundary>

      <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home"><PersonalizedCampusHome /></WidgetBoundary>
      <WidgetBoundary name="TaskContinuity" title="Task Continuity"><TaskContinuity /></WidgetBoundary>
      <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar"><UnifiedCampusCalendar /></WidgetBoundary>
      <WidgetBoundary name="RoleAnalytics" title="Role Analytics"><RoleAnalytics /></WidgetBoundary>
      <WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
      <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter /></WidgetBoundary>
      <DevContactStrip />
    </div>
  );
}
